using System.Text;

namespace SKYNET.Client.Services;

/// <summary>
/// Reads only the PE import/export tables needed by the launcher. Keeping this
/// parser managed avoids loading a payload DLL into the launcher merely to inspect
/// its exports, which also keeps x86 game support available from an x64 launcher.
/// </summary>
internal static class PeImports
{
    internal sealed class ImportSymbol
    {
        public string ModuleName { get; set; } = "";
        public string? Name { get; set; }
        public ushort? Ordinal { get; set; }
        public uint IatRva { get; set; }
        public int PointerSize { get; set; }
    }

    public static bool ImportsModule(string path, string moduleName)
    {
        try
        {
            using var image = new PeImage(path);
            return image.FindImportNameFieldRvas(moduleName).Count != 0;
        }
        catch
        {
            return false;
        }
    }

    public static IReadOnlyList<ImportSymbol> ReadImports(string path)
    {
        using var image = new PeImage(path);
        return image.ReadImports();
    }

    public static IReadOnlyList<uint> FindImportNameFieldRvas(string path, string moduleName)
    {
        using var image = new PeImage(path);
        return image.FindImportNameFieldRvas(moduleName);
    }

    public static IReadOnlyList<uint> FindDelayImportNameRvas(string path, string moduleName)
    {
        using var image = new PeImage(path);
        return image.FindDelayImportNameRvas(moduleName);
    }

    public static IReadOnlyList<uint> FindAsciiStringRvas(string path, string value)
    {
        using var image = new PeImage(path);
        return image.FindAsciiStringRvas(value);
    }

    private sealed class PeImage : IDisposable
    {
        private const ushort DosSignature = 0x5A4D;
        private const uint PeSignature = 0x00004550;
        private const ushort Pe32 = 0x10B;
        private const ushort Pe32Plus = 0x20B;
        private readonly FileStream _stream;
        private readonly BinaryReader _reader;
        private readonly List<Section> _sections = new();
        private readonly uint _importRva;
        private readonly uint _delayImportRva;
        private readonly uint _delayImportSize;
        private readonly ulong _imageBase;

        public PeImage(string path)
        {
            _stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            _reader = new BinaryReader(_stream, Encoding.ASCII, leaveOpen: true);

            if (ReadUInt16(0) != DosSignature)
                throw new InvalidDataException("The file is not a PE image.");

            var peOffset = ReadUInt32(0x3C);
            if (ReadUInt32(peOffset) != PeSignature)
                throw new InvalidDataException("The file has an invalid PE signature.");

            var sectionCount = ReadUInt16(peOffset + 6);
            var optionalHeaderSize = ReadUInt16(peOffset + 20);
            var optionalHeader = peOffset + 24;
            var magic = ReadUInt16(optionalHeader);
            PointerSize = magic switch
            {
                Pe32 => 4,
                Pe32Plus => 8,
                _ => throw new InvalidDataException("The file has an unsupported PE optional header.")
            };

            var dataDirectories = optionalHeader + (PointerSize == 8 ? 112u : 96u);
            var directoryCount = ReadUInt32(optionalHeader + (PointerSize == 8 ? 108u : 92u));
            _imageBase = PointerSize == 8
                ? ReadUInt64(optionalHeader + 24)
                : ReadUInt32(optionalHeader + 28);
            _importRva = directoryCount > 1 ? ReadUInt32(dataDirectories + 8) : 0;
            _delayImportRva = directoryCount > 13 ? ReadUInt32(dataDirectories + (13 * 8)) : 0;
            _delayImportSize = directoryCount > 13 ? ReadUInt32(dataDirectories + (13 * 8) + 4) : 0;

            var sectionOffset = optionalHeader + optionalHeaderSize;
            for (var index = 0; index < sectionCount; index++)
            {
                var offset = sectionOffset + (uint)(index * 40);
                _sections.Add(new Section(
                    ReadUInt32(offset + 8),
                    ReadUInt32(offset + 12),
                    ReadUInt32(offset + 16),
                    ReadUInt32(offset + 20)));
            }
        }

        public int PointerSize { get; }

        public IReadOnlyList<ImportSymbol> ReadImports()
        {
            var result = new List<ImportSymbol>();
            if (_importRva == 0)
                return result;

            var descriptorOffset = RvaToOffset(_importRva);
            for (var descriptorIndex = 0; ; descriptorIndex++)
            {
                var offset = descriptorOffset + (uint)(descriptorIndex * 20);
                var originalFirstThunk = ReadUInt32(offset);
                var nameRva = ReadUInt32(offset + 12);
                var firstThunk = ReadUInt32(offset + 16);
                if (originalFirstThunk == 0 && nameRva == 0 && firstThunk == 0)
                    break;
                if (nameRva == 0 || firstThunk == 0)
                    continue;

                var moduleName = ReadAnsiZ(RvaToOffset(nameRva));
                var lookupThunk = originalFirstThunk == 0 ? firstThunk : originalFirstThunk;
                for (var thunkIndex = 0; ; thunkIndex++)
                {
                    var thunkRva = lookupThunk + (uint)(thunkIndex * PointerSize);
                    var thunkValue = PointerSize == 8
                        ? ReadUInt64(RvaToOffset(thunkRva))
                        : ReadUInt32(RvaToOffset(thunkRva));
                    if (thunkValue == 0)
                        break;

                    var isOrdinal = PointerSize == 8
                        ? (thunkValue & 0x8000000000000000UL) != 0
                        : (thunkValue & 0x80000000U) != 0;
                    var iatRva = firstThunk + (uint)(thunkIndex * PointerSize);
                    if (isOrdinal)
                    {
                        result.Add(new ImportSymbol
                        {
                            ModuleName = moduleName,
                            Ordinal = (ushort)(thunkValue & 0xFFFF),
                            IatRva = iatRva,
                            PointerSize = PointerSize
                        });
                        continue;
                    }

                    var importByNameOffset = RvaToOffset((uint)thunkValue);
                    result.Add(new ImportSymbol
                    {
                        ModuleName = moduleName,
                        Name = ReadAnsiZ(importByNameOffset + 2),
                        IatRva = iatRva,
                        PointerSize = PointerSize
                    });
                }
            }

            return result;
        }

        public IReadOnlyList<uint> FindImportNameFieldRvas(string moduleName)
        {
            var result = new List<uint>();
            if (_importRva != 0)
            {
                var descriptorOffset = RvaToOffset(_importRva);
                for (var descriptorIndex = 0; ; descriptorIndex++)
                {
                    var descriptorRva = _importRva + (uint)(descriptorIndex * 20);
                    var offset = descriptorOffset + (uint)(descriptorIndex * 20);
                    var originalFirstThunk = ReadUInt32(offset);
                    var nameRva = ReadUInt32(offset + 12);
                    var firstThunk = ReadUInt32(offset + 16);
                    if (originalFirstThunk == 0 && nameRva == 0 && firstThunk == 0)
                        break;
                    if (nameRva != 0 && string.Equals(ReadAnsiZ(RvaToOffset(nameRva)), moduleName, StringComparison.OrdinalIgnoreCase))
                        result.Add(descriptorRva + 12);
                }
            }

            FindDelayImports(moduleName, result, null);

            return result;
        }

        public IReadOnlyList<uint> FindDelayImportNameRvas(string moduleName)
        {
            var result = new List<uint>();
            FindDelayImports(moduleName, null, result);
            return result;
        }

        public IReadOnlyList<uint> FindAsciiStringRvas(string value)
        {
            if (string.IsNullOrEmpty(value))
                return Array.Empty<uint>();

            var pattern = Encoding.ASCII.GetBytes(value + "\0");
            var result = new List<uint>();
            var buffer = new byte[(1024 * 1024) + pattern.Length - 1];
            _stream.Position = 0;
            long bytesReadFromFile = 0;
            var carried = 0;

            while (true)
            {
                var read = _stream.Read(buffer, carried, buffer.Length - carried);
                if (read == 0)
                    break;

                var available = carried + read;
                var bufferFileOffset = bytesReadFromFile - carried;
                for (var index = 0; index <= available - pattern.Length; index++)
                {
                    var matches = true;
                    for (var patternIndex = 0; patternIndex < pattern.Length; patternIndex++)
                    {
                        if (buffer[index + patternIndex] == pattern[patternIndex])
                            continue;
                        matches = false;
                        break;
                    }

                    if (!matches)
                        continue;

                    var fileOffset = checked((uint)(bufferFileOffset + index));
                    if (TryOffsetToRva(fileOffset, out var rva))
                        result.Add(rva);
                }

                bytesReadFromFile += read;
                carried = Math.Min(pattern.Length - 1, available);
                Buffer.BlockCopy(buffer, available - carried, buffer, 0, carried);
            }

            return result;
        }

        private void FindDelayImports(
            string moduleName,
            ICollection<uint>? nameFieldRvas,
            ICollection<uint>? nameRvas)
        {
            if (_delayImportRva == 0)
                return;

            const uint descriptorSize = 32;
            var descriptorOffset = RvaToOffset(_delayImportRva);
            var descriptorLimit = _delayImportSize == 0
                ? 1024u
                : Math.Min(1024u, _delayImportSize / descriptorSize);

            for (uint descriptorIndex = 0; descriptorIndex < descriptorLimit; descriptorIndex++)
            {
                var descriptorRva = _delayImportRva + descriptorIndex * descriptorSize;
                var offset = descriptorOffset + descriptorIndex * descriptorSize;
                var attributes = ReadUInt32(offset);
                var nameAddress = ReadUInt32(offset + 4);
                var moduleHandle = ReadUInt32(offset + 8);
                var importAddressTable = ReadUInt32(offset + 12);
                var importNameTable = ReadUInt32(offset + 16);
                if (attributes == 0 && nameAddress == 0 && moduleHandle == 0 &&
                    importAddressTable == 0 && importNameTable == 0)
                    break;
                if (nameAddress == 0)
                    continue;

                var nameRva = (attributes & 1) != 0
                    ? nameAddress
                    : checked((uint)((ulong)nameAddress - _imageBase));
                if (string.Equals(ReadAnsiZ(RvaToOffset(nameRva)), moduleName, StringComparison.OrdinalIgnoreCase))
                {
                    nameFieldRvas?.Add(descriptorRva + 4);
                    nameRvas?.Add(nameRva);
                }
            }
        }

        private uint RvaToOffset(uint rva)
        {
            foreach (var section in _sections)
            {
                var size = Math.Max(section.VirtualSize, section.RawSize);
                if (rva >= section.VirtualAddress && rva < section.VirtualAddress + size)
                    return section.RawOffset + rva - section.VirtualAddress;
            }

            throw new InvalidDataException($"RVA 0x{rva:X8} is outside the PE sections.");
        }

        private bool TryOffsetToRva(uint offset, out uint rva)
        {
            foreach (var section in _sections)
            {
                if (offset < section.RawOffset || offset >= section.RawOffset + section.RawSize)
                    continue;
                rva = section.VirtualAddress + offset - section.RawOffset;
                return true;
            }

            rva = 0;
            return false;
        }

        private ushort ReadUInt16(uint offset)
        {
            _stream.Position = offset;
            return _reader.ReadUInt16();
        }

        private uint ReadUInt32(uint offset)
        {
            _stream.Position = offset;
            return _reader.ReadUInt32();
        }

        private ulong ReadUInt64(uint offset)
        {
            _stream.Position = offset;
            return _reader.ReadUInt64();
        }

        private string ReadAnsiZ(uint offset)
        {
            _stream.Position = offset;
            var bytes = new List<byte>();
            for (var index = 0; index < 4096; index++)
            {
                var value = _reader.ReadByte();
                if (value == 0)
                    return Encoding.ASCII.GetString(bytes.ToArray());
                bytes.Add(value);
            }

            throw new InvalidDataException("PE string exceeds the supported length.");
        }

        public void Dispose()
        {
            _reader.Dispose();
            _stream.Dispose();
        }

        private readonly struct Section
        {
            public Section(uint virtualSize, uint virtualAddress, uint rawSize, uint rawOffset)
            {
                VirtualSize = virtualSize;
                VirtualAddress = virtualAddress;
                RawSize = rawSize;
                RawOffset = rawOffset;
            }

            public uint VirtualSize { get; }
            public uint VirtualAddress { get; }
            public uint RawSize { get; }
            public uint RawOffset { get; }
        }
    }
}
