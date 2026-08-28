using System.Text;

namespace SKYNET_server.Services;

/// <summary>
/// Minimal reader for uncompressed entries in Valve VPK directory archives.
/// Source 2 text schemas such as items_game.txt are stored this way even when
/// their payload lives in a numbered archive next to pak01_dir.vpk.
/// </summary>
internal static class ValveVpkReader
{
    private const uint Signature = 0x55AA1234;

    public static string ReadText(string directoryArchivePath, string entryPath)
    {
        var wanted = entryPath.Replace('\\', '/').TrimStart('/').ToLowerInvariant();
        using var stream = File.OpenRead(directoryArchivePath);
        using var reader = new BinaryReader(stream, Encoding.UTF8, leaveOpen: false);
        var signature = reader.ReadUInt32();
        if (signature != Signature)
        {
            throw new InvalidDataException($"Invalid VPK: signature {signature:X8}.");
        }

        var version = reader.ReadUInt32();
        if (version is not (1 or 2))
        {
            throw new InvalidDataException($"Unsupported VPK version {version}.");
        }

        var treeLength = reader.ReadUInt32();
        if (version == 2)
        {
            _ = reader.ReadUInt32();
            _ = reader.ReadUInt32();
            _ = reader.ReadUInt32();
            _ = reader.ReadUInt32();
        }

        var treeStart = stream.Position;
        while (stream.Position < treeStart + treeLength)
        {
            var extension = ReadNullString(reader);
            if (extension.Length == 0)
            {
                break;
            }

            while (true)
            {
                var directory = ReadNullString(reader);
                if (directory.Length == 0)
                {
                    break;
                }

                while (true)
                {
                    var fileName = ReadNullString(reader);
                    if (fileName.Length == 0)
                    {
                        break;
                    }

                    _ = reader.ReadUInt32();
                    var preloadBytes = reader.ReadUInt16();
                    var archiveIndex = reader.ReadUInt16();
                    var entryOffset = reader.ReadUInt32();
                    var entryLength = reader.ReadUInt32();
                    _ = reader.ReadUInt16();

                    var preload = preloadBytes > 0 ? reader.ReadBytes(preloadBytes) : Array.Empty<byte>();
                    var fullPath = BuildPath(directory, fileName, extension);
                    if (!string.Equals(fullPath, wanted, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (entryLength > int.MaxValue - preload.Length)
                    {
                        throw new InvalidDataException($"VPK entry {entryPath} is too large.");
                    }

                    var payload = new byte[preload.Length + (int)entryLength];
                    Buffer.BlockCopy(preload, 0, payload, 0, preload.Length);

                    if (entryLength > 0)
                    {
                        var archivePath = archiveIndex == 0x7FFF
                            ? directoryArchivePath
                            : Path.Combine(
                                Path.GetDirectoryName(directoryArchivePath)!,
                                $"{Path.GetFileNameWithoutExtension(directoryArchivePath).Replace("_dir", string.Empty)}_{archiveIndex:D3}.vpk");

                        using var archive = File.OpenRead(archivePath);
                        archive.Position = entryOffset;
                        archive.ReadExactly(payload, preload.Length, (int)entryLength);
                    }

                    return Encoding.UTF8.GetString(payload);
                }
            }
        }

        throw new FileNotFoundException($"{entryPath} not found inside {directoryArchivePath}.", entryPath);
    }

    private static string BuildPath(string directory, string fileName, string extension)
    {
        var name = extension == " " ? fileName : $"{fileName}.{extension}";
        return directory == " " ? name.ToLowerInvariant() : $"{directory}/{name}".ToLowerInvariant();
    }

    private static string ReadNullString(BinaryReader reader)
    {
        var bytes = new List<byte>(64);
        while (true)
        {
            var value = reader.ReadByte();
            if (value == 0)
            {
                return Encoding.UTF8.GetString(bytes.ToArray());
            }

            bytes.Add(value);
        }
    }
}
