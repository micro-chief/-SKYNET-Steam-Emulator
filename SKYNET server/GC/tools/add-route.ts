import * as fs from "node:fs";

/*
 * Deadlock 1422450
 * REAL POST-START CAPTURE REPLAY V7
 *
 * Run:
 * node --experimental-strip-types tools/add-route.ts
 *
 * V7:
 * - proven 105/106/107/108 extraction
 * - no fixed wrapper offset
 * - no dependency on ctx.*
 * - finds ANY function call containing top-level arg exactly 9100
 * - assumes payload is the NEXT top-level argument
 * - clones exact transport call shape
 * - aborts on ambiguity
 * - backup before modification
 * - modifies ONLY RequestDeadlockPartyStartMatch.ts
 */

const CAPTURE_FILE =
    "D:\\deadlock-nethook-all-1908-1.txt";

const ROUTE_FILE =
    "D:\\Visual Studio Test repos\\-SKYNET-Steam-Emulator-master\\SKYNET server\\GC\\1422450\\modules\\RequestDeadlockPartyStartMatch.ts";

const BACKUP_DIR =
    "D:\\Visual Studio Test repos\\-SKYNET-Steam-Emulator-master\\SKYNET server\\GC\\tools\\backups";

const APP_ID =
    1422450;

const PATCH_BEGIN =
    "// === DEADLOCK_REAL_POST_START_CAPTURE_REPLAY_BEGIN ===";

const PATCH_END =
    "// === DEADLOCK_REAL_POST_START_CAPTURE_REPLAY_END ===";

const RECORDS = [
    {
        sequence: 105,
        messageType: 24,
        fullSize: 82,
        bodySize: 34,
        wrapperSize: 48,
        lengthVarintBytes: 1,
        fingerprint: "94F43E1B"
    },
    {
        sequence: 106,
        messageType: 24,
        fullSize: 131,
        bodySize: 83,
        wrapperSize: 48,
        lengthVarintBytes: 1,
        fingerprint: "645B78A6"
    },
    {
        sequence: 107,
        messageType: 26,
        fullSize: 292,
        bodySize: 243,
        wrapperSize: 49,
        lengthVarintBytes: 2,
        fingerprint: "83E18991"
    },
    {
        sequence: 108,
        messageType: 26,
        fullSize: 122,
        bodySize: 74,
        wrapperSize: 48,
        lengthVarintBytes: 1,
        fingerprint: "F13CF11B"
    }
];

function verify(): void {
    return;
}

function fail(
    message: string
): never {
    throw new Error(message);
}

function check(
    condition: boolean,
    message: string
): void {
    if (!condition) {
        fail(message);
    }
}

function readUInt32LE(
    data: Buffer,
    offset: number
): number {
    check(
        offset >= 0 &&
        offset + 4 <= data.length,
        "readUInt32LE out of range"
    );

    return data.readUInt32LE(offset);
}

function decodeVarint(
    data: Buffer,
    offset: number
): {
    value: number;
    next: number;
    bytes: number;
} {
    let value = 0;
    let multiplier = 1;
    let index = offset;
    let count = 0;

    while (
        index < data.length &&
        count < 10
    ) {
        const byte =
            data[index];

        value +=
            (byte & 0x7F) *
            multiplier;

        index++;
        count++;

        if (
            (byte & 0x80) === 0
        ) {
            check(
                Number.isSafeInteger(value),
                "Varint exceeds safe integer range"
            );

            return {
                value: value,
                next: index,
                bytes: count
            };
        }

        multiplier *= 128;
    }

    fail(
        "Invalid or truncated varint"
    );
}

function extractRecordSection(
    text: string,
    sequence: number
): string {
    const padded =
        String(sequence).padStart(
            3,
            "0"
        );

    const marker =
        "FILE: " +
        padded +
        "_in_5453_k_EMsgClientFromGC.txt";

    const start =
        text.indexOf(marker);

    check(
        start >= 0,
        "[capture] record not found: " +
        marker
    );

    const next =
        text.indexOf(
            "FILE:",
            start + marker.length
        );

    if (
        next < 0
    ) {
        return text.substring(start);
    }

    return text.substring(
        start,
        next
    );
}

function extractDeclaredSize(
    section: string
): number {
    const match =
        section.match(
            /Size:\s*([0-9]+)\s*bytes/
        );

    check(
        match !== null,
        "[capture] Size field missing"
    );

    return parseInt(
        match![1],
        10
    );
}

function extractHexBytes(
    section: string
): Buffer {
    const lines =
        section.split(/\r?\n/);

    const bytes: number[] =
        [];

    let rowCount =
        0;

    for (
        let lineIndex = 0;
        lineIndex < lines.length;
        lineIndex++
    ) {
        const line =
            lines[lineIndex];

        if (
            line.length < 8
        ) {
            continue;
        }

        const offsetText =
            line.substring(
                0,
                8
            );

        if (
            !/^[0-9A-Fa-f]{8}$/.test(
                offsetText
            )
        ) {
            continue;
        }

        let byteText =
            line.substring(8);

        const asciiIndex =
            byteText.indexOf("|");

        if (
            asciiIndex >= 0
        ) {
            byteText =
                byteText.substring(
                    0,
                    asciiIndex
                );
        }

        const tokens =
            byteText
                .trim()
                .split(/\s+/);

        let rowBytes =
            0;

        for (
            let tokenIndex = 0;
            tokenIndex < tokens.length;
            tokenIndex++
        ) {
            const token =
                tokens[tokenIndex];

            if (
                /^[0-9A-Fa-f]{2}$/.test(
                    token
                )
            ) {
                bytes.push(
                    parseInt(
                        token,
                        16
                    )
                );

                rowBytes++;
            }
        }

        if (
            rowBytes > 0
        ) {
            rowCount++;
        }
    }

    check(
        rowCount > 0,
        "[capture] no hex rows parsed"
    );

    check(
        bytes.length > 0,
        "[capture] no bytes parsed"
    );

    return Buffer.from(bytes);
}

function extractSteamBody(
    full: Buffer
): {
    body: Buffer;
    protoHeaderLength: number;
    bodyOffset: number;
} {
    check(
        full.length >= 8,
        "[capture] Steam packet too short"
    );

    const outerType =
        readUInt32LE(
            full,
            0
        );

    const expectedOuter =
        (
            5453 |
            0x80000000
        ) >>> 0;

    check(
        outerType === expectedOuter,
        "[capture] outer Steam EMsg mismatch"
    );

    const protoHeaderLength =
        readUInt32LE(
            full,
            4
        );

    const bodyOffset =
        8 +
        protoHeaderLength;

    check(
        bodyOffset < full.length,
        "[capture] invalid Steam proto header length"
    );

    return {
        body:
            full.subarray(bodyOffset),

        protoHeaderLength:
            protoHeaderLength,

        bodyOffset:
            bodyOffset
    };
}

function extractClientFromGc(
    steamBody: Buffer,
    expectedMessageType: number
): {
    gcPacket: Buffer;
    payloadLengthBytes: number;
} {
    let offset =
        0;

    check(
        steamBody[offset] === 0x08,
        "[capture] field 1 missing"
    );

    offset++;

    const appId =
        decodeVarint(
            steamBody,
            offset
        );

    check(
        appId.value === APP_ID,
        "[capture] AppId mismatch"
    );

    offset =
        appId.next;

    check(
        steamBody[offset] === 0x10,
        "[capture] field 2 missing"
    );

    offset++;

    const messageType =
        decodeVarint(
            steamBody,
            offset
        );

    const expectedRaw =
        (
            expectedMessageType |
            0x80000000
        ) >>> 0;

    check(
        messageType.value === expectedRaw,
        "[capture] outer GC MessageType mismatch"
    );

    offset =
        messageType.next;

    check(
        steamBody[offset] === 0x1A,
        "[capture] field 3 missing"
    );

    offset++;

    const payloadLength =
        decodeVarint(
            steamBody,
            offset
        );

    offset =
        payloadLength.next;

    const end =
        offset +
        payloadLength.value;

    check(
        end === steamBody.length,
        "[capture] GC packet length mismatch"
    );

    return {
        gcPacket:
            steamBody.subarray(
                offset,
                end
            ),

        payloadLengthBytes:
            payloadLength.bytes
    };
}

function extractGcBody(
    gcPacket: Buffer,
    messageType: number,
    bodySize: number
): Buffer {
    check(
        gcPacket.length >= 8,
        "[capture] GC packet too short"
    );

    const actualType =
        readUInt32LE(
            gcPacket,
            0
        );

    const expectedType =
        (
            messageType |
            0x80000000
        ) >>> 0;

    check(
        actualType === expectedType,
        "[capture] inner GC MessageType mismatch"
    );

    const headerLength =
        readUInt32LE(
            gcPacket,
            4
        );

    check(
        headerLength === 0,
        "[capture] inner header length != 0"
    );

    const body =
        gcPacket.subarray(8);

    check(
        body.length === bodySize,
        "[capture] body size mismatch"
    );

    return Buffer.from(body);
}

function fnv1a32(
    data: Buffer
): string {
    let hash =
        0x811C9DC5;

    for (
        let index = 0;
        index < data.length;
        index++
    ) {
        hash ^=
            data[index];

        hash =
            Math.imul(
                hash,
                0x01000193
            );

        hash >>>=
            0;
    }

    return hash
        .toString(16)
        .toUpperCase()
        .padStart(
            8,
            "0"
        );
}

function renderArray(
    name: string,
    data: Buffer
): string {
    const values: string[] =
        [];

    for (
        let index = 0;
        index < data.length;
        index++
    ) {
        values.push(
            String(data[index])
        );
    }

    const lines: string[] =
        [];

    for (
        let index = 0;
        index < values.length;
        index += 16
    ) {
        lines.push(
            "        " +
            values
                .slice(
                    index,
                    index + 16
                )
                .join(", ")
        );
    }

    return (
        "    const " +
        name +
        " = [\n" +
        lines.join(",\n") +
        "\n" +
        "    ];\n"
    );
}

function findMatchingParen(
    text: string,
    openIndex: number
): number {
    let depth =
        0;

    let quote =
        "";

    let escaped =
        false;

    let lineComment =
        false;

    let blockComment =
        false;

    for (
        let index = openIndex;
        index < text.length;
        index++
    ) {
        const current =
            text[index];

        const next =
            index + 1 < text.length
                ? text[index + 1]
                : "";

        if (
            lineComment
        ) {
            if (
                current === "\n"
            ) {
                lineComment =
                    false;
            }

            continue;
        }

        if (
            blockComment
        ) {
            if (
                current === "*" &&
                next === "/"
            ) {
                blockComment =
                    false;

                index++;
            }

            continue;
        }

        if (
            quote !== ""
        ) {
            if (
                escaped
            ) {
                escaped =
                    false;

                continue;
            }

            if (
                current === "\\"
            ) {
                escaped =
                    true;

                continue;
            }

            if (
                current === quote
            ) {
                quote =
                    "";
            }

            continue;
        }

        if (
            current === "/" &&
            next === "/"
        ) {
            lineComment =
                true;

            index++;

            continue;
        }

        if (
            current === "/" &&
            next === "*"
        ) {
            blockComment =
                true;

            index++;

            continue;
        }

        if (
            current === "\"" ||
            current === "'" ||
            current === "`"
        ) {
            quote =
                current;

            continue;
        }

        if (
            current === "("
        ) {
            depth++;

            continue;
        }

        if (
            current === ")"
        ) {
            depth--;

            if (
                depth === 0
            ) {
                return index;
            }
        }
    }

    return -1;
}

function splitTopLevelArguments(
    text: string
): string[] {
    const result: string[] =
        [];

    let start =
        0;

    let round =
        0;

    let square =
        0;

    let curly =
        0;

    let quote =
        "";

    let escaped =
        false;

    for (
        let index = 0;
        index < text.length;
        index++
    ) {
        const current =
            text[index];

        if (
            quote !== ""
        ) {
            if (
                escaped
            ) {
                escaped =
                    false;

                continue;
            }

            if (
                current === "\\"
            ) {
                escaped =
                    true;

                continue;
            }

            if (
                current === quote
            ) {
                quote =
                    "";
            }

            continue;
        }

        if (
            current === "\"" ||
            current === "'" ||
            current === "`"
        ) {
            quote =
                current;

            continue;
        }

        if (
            current === "("
        ) {
            round++;

            continue;
        }

        if (
            current === ")"
        ) {
            round--;

            continue;
        }

        if (
            current === "["
        ) {
            square++;

            continue;
        }

        if (
            current === "]"
        ) {
            square--;

            continue;
        }

        if (
            current === "{"
        ) {
            curly++;

            continue;
        }

        if (
            current === "}"
        ) {
            curly--;

            continue;
        }

        if (
            current === "," &&
            round === 0 &&
            square === 0 &&
            curly === 0
        ) {
            result.push(
                text
                    .substring(
                        start,
                        index
                    )
                    .trim()
            );

            start =
                index + 1;
        }
    }

    result.push(
        text
            .substring(start)
            .trim()
    );

    return result;
}

function skipWhitespace(
    text: string,
    start: number
): number {
    let index =
        start;

    while (
        index < text.length &&
        /\s/.test(text[index])
    ) {
        index++;
    }

    return index;
}

/*
 * Find ANY dotted/plain call:
 *
 * sendGc(...)
 * sendRaw(...)
 * transport.send(...)
 * ctx.send(...)
 * helper.transport.send(...)
 *
 * and inspect its top-level arguments.
 */
function findAllCalls(
    text: string
): {
    start: number;
    end: number;
    callee: string;
    args: string[];
    callText: string;
}[] {
    const result: {
        start: number;
        end: number;
        callee: string;
        args: string[];
        callText: string;
    }[] = [];

    const pattern =
        /([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(/g;

    let match =
        pattern.exec(text);

    while (
        match !== null
    ) {
        const start =
            match.index;

        const callee =
            match[1];

        /*
         * Ignore common language constructs.
         */
        if (
            callee === "if" ||
            callee === "for" ||
            callee === "while" ||
            callee === "switch" ||
            callee === "catch" ||
            callee === "function"
        ) {
            match =
                pattern.exec(text);

            continue;
        }

        const openParen =
            text.indexOf(
                "(",
                start
            );

        if (
            openParen < 0
        ) {
            break;
        }

        const closeParen =
            findMatchingParen(
                text,
                openParen
            );

        if (
            closeParen < 0
        ) {
            pattern.lastIndex =
                openParen + 1;

            match =
                pattern.exec(text);

            continue;
        }

        let end =
            skipWhitespace(
                text,
                closeParen + 1
            );

        if (
            text[end] === ";"
        ) {
            end++;
        } else {
            end =
                closeParen + 1;
        }

        const argumentText =
            text.substring(
                openParen + 1,
                closeParen
            );

        const args =
            splitTopLevelArguments(
                argumentText
            );

        result.push(
            {
                start:
                    start,

                end:
                    end,

                callee:
                    callee,

                args:
                    args,

                callText:
                    text.substring(
                        start,
                        end
                    )
            }
        );

        pattern.lastIndex =
            end;

        match =
            pattern.exec(text);
    }

    return result;
}

function normalizeArg(
    value: string
): string {
    return value
        .replace(
            /\s+/g,
            ""
        )
        .replace(
            /^\(+/,
            ""
        )
        .replace(
            /\)+$/,
            ""
        );
}

function print9100Occurrences(
    routeText: string
): void {
    console.log("");
    console.log(
        "[route] literal 9100 occurrences:"
    );

    let offset =
        0;

    let count =
        0;

    while (
        true
    ) {
        const found =
            routeText.indexOf(
                "9100",
                offset
            );

        if (
            found < 0
        ) {
            break;
        }

        count++;

        let start =
            found - 100;

        if (
            start < 0
        ) {
            start =
                0;
        }

        let end =
            found + 180;

        if (
            end > routeText.length
        ) {
            end =
                routeText.length;
        }

        console.log(
            "  #" +
            count +
            " " +
            routeText
                .substring(
                    start,
                    end
                )
                .replace(
                    /\s+/g,
                    " "
                )
        );

        offset =
            found + 4;
    }

    console.log(
        "[route] literal 9100 count=" +
        count
    );
}

function find9100TransportCall(
    routeText: string
): {
    start: number;
    end: number;
    callee: string;
    args: string[];
    messageArgIndex: number;
    payloadArgIndex: number;
    callText: string;
} {
    const calls =
        findAllCalls(
            routeText
        );

    const candidates: {
        start: number;
        end: number;
        callee: string;
        args: string[];
        messageArgIndex: number;
        payloadArgIndex: number;
        callText: string;
    }[] = [];

    for (
        let callIndex = 0;
        callIndex < calls.length;
        callIndex++
    ) {
        const call =
            calls[callIndex];

        for (
            let argIndex = 0;
            argIndex < call.args.length;
            argIndex++
        ) {
            const normalized =
                normalizeArg(
                    call.args[argIndex]
                );

            if (
                normalized !== "9100"
            ) {
                continue;
            }

            /*
             * For a transport call we need a payload after msg type.
             *
             * Examples:
             *
             * sendGc(9100, body)
             * sendGc(ctx, 9100, body)
             *
             * If 9100 is the final argument, we refuse.
             */
            if (
                argIndex + 1 >=
                call.args.length
            ) {
                continue;
            }

            candidates.push(
                {
                    start:
                        call.start,

                    end:
                        call.end,

                    callee:
                        call.callee,

                    args:
                        call.args,

                    messageArgIndex:
                        argIndex,

                    payloadArgIndex:
                        argIndex + 1,

                    callText:
                        call.callText
                }
            );
        }
    }

    console.log("");
    console.log(
        "[route] function-call candidates containing top-level 9100:"
    );

    for (
        let index = 0;
        index < candidates.length;
        index++
    ) {
        const candidate =
            candidates[index];

        console.log(
            "  candidate #" +
            (index + 1)
        );

        console.log(
            "    callee=" +
            candidate.callee
        );

        console.log(
            "    args=" +
            candidate.args.length
        );

        console.log(
            "    messageArgIndex=" +
            candidate.messageArgIndex
        );

        console.log(
            "    payloadArgIndex=" +
            candidate.payloadArgIndex
        );

        console.log(
            "    call=" +
            candidate.callText
                .replace(
                    /\s+/g,
                    " "
                )
                .substring(
                    0,
                    700
                )
        );
    }

    if (
        candidates.length === 0
    ) {
        print9100Occurrences(
            routeText
        );
    }

    check(
        candidates.length > 0,
        "[route] no function call with top-level argument 9100 found"
    );

    check(
        candidates.length === 1,
        "[route] ambiguous 9100 transport: expected 1 candidate, found " +
        candidates.length
    );

    return candidates[0];
}

/*
 * Clone EXACT original call shape.
 *
 * Only:
 *
 * args[messageArgIndex] = 24/26
 * args[payloadArgIndex] = captured body variable
 *
 * Everything else is preserved.
 */
function cloneTransportCall(
    original: {
        callee: string;
        args: string[];
        messageArgIndex: number;
        payloadArgIndex: number;
    },
    messageType: number,
    payloadName: string
): string {
    const args: string[] =
        [];

    for (
        let index = 0;
        index < original.args.length;
        index++
    ) {
        if (
            index ===
            original.messageArgIndex
        ) {
            args.push(
                String(messageType)
            );

            continue;
        }

        if (
            index ===
            original.payloadArgIndex
        ) {
            args.push(
                payloadName
            );

            continue;
        }

        args.push(
            original.args[index]
        );
    }

    let result =
        "";

    result +=
        "    " +
        original.callee +
        "(\n";

    for (
        let index = 0;
        index < args.length;
        index++
    ) {
        result +=
            "        " +
            args[index];

        if (
            index + 1 <
            args.length
        ) {
            result += ",";
        }

        result += "\n";
    }

    result +=
        "    );";

    return result;
}

function buildReplayBlock(
    transport: {
        callee: string;
        args: string[];
        messageArgIndex: number;
        payloadArgIndex: number;
    },
    body105: Buffer,
    body106: Buffer,
    body107: Buffer,
    body108: Buffer
): string {
    let result =
        "";

    result +=
        "\n\n";

    result +=
        PATCH_BEGIN +
        "\n";

    result +=
        "    /* Exact successful Valve capture bodies 105-108. */\n";

    result +=
        "    /* Existing 9100 transport call shape is cloned exactly. */\n";

    result +=
        renderArray(
            "realPostStart105",
            body105
        );

    result += "\n";

    result +=
        renderArray(
            "realPostStart106",
            body106
        );

    result += "\n";

    result +=
        renderArray(
            "realPostStart107",
            body107
        );

    result += "\n";

    result +=
        renderArray(
            "realPostStart108",
            body108
        );

    result += "\n";

    result +=
        "    log(\"[9131-POST] replay seq=105 msg=24 bytes=34\");\n";

    result +=
        cloneTransportCall(
            transport,
            24,
            "realPostStart105"
        );

    result +=
        "\n\n";

    result +=
        "    log(\"[9131-POST] replay seq=106 msg=24 bytes=83 REAL type_id=101\");\n";

    result +=
        cloneTransportCall(
            transport,
            24,
            "realPostStart106"
        );

    result +=
        "\n\n";

    result +=
        "    log(\"[9131-POST] replay seq=107 msg=26 bytes=243 REAL type_id=105\");\n";

    result +=
        cloneTransportCall(
            transport,
            26,
            "realPostStart107"
        );

    result +=
        "\n\n";

    result +=
        "    log(\"[9131-POST] replay seq=108 msg=26 bytes=74 REAL type_id=101\");\n";

    result +=
        cloneTransportCall(
            transport,
            26,
            "realPostStart108"
        );

    result +=
        "\n\n";

    result +=
        "    log(\"[9131-POST] sequence=9131->26->9132->9100->24->24->26->26\");\n";

    result +=
        PATCH_END;

    return result;
}

function createBackupPath(): string {
    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    return (
        BACKUP_DIR +
        "\\RequestDeadlockPartyStartMatch.ts." +
        timestamp +
        ".bak"
    );
}

function main(): void {
    verify();

    console.log(
        "============================================================"
    );

    console.log(
        " Deadlock 1422450 - REAL POST-START CAPTURE REPLAY V7"
    );

    console.log(
        "============================================================"
    );

    check(
        fs.existsSync(
            CAPTURE_FILE
        ),
        "Capture not found: " +
        CAPTURE_FILE
    );

    check(
        fs.existsSync(
            ROUTE_FILE
        ),
        "Route not found: " +
        ROUTE_FILE
    );

    const captureText =
        fs.readFileSync(
            CAPTURE_FILE,
            "utf8"
        );

    const routeText =
        fs.readFileSync(
            ROUTE_FILE,
            "utf8"
        );

    check(
        routeText.indexOf(
            PATCH_BEGIN
        ) < 0,
        "[route] replay patch already installed"
    );

    console.log("");
    console.log("[capture] using:");
    console.log("  " + CAPTURE_FILE);

    /*
     * =========================================================
     * CAPTURE VALIDATION
     * =========================================================
     */

    const bodies: Buffer[] =
        [];

    for (
        let index = 0;
        index < RECORDS.length;
        index++
    ) {
        const record =
            RECORDS[index];

        const section =
            extractRecordSection(
                captureText,
                record.sequence
            );

        const declaredSize =
            extractDeclaredSize(
                section
            );

        const full =
            extractHexBytes(
                section
            );

        console.log("");
        console.log(
            "[capture] seq=" +
            record.sequence +
            " msg=" +
            record.messageType
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " declared.bytes=" +
            declaredSize
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " parsed.bytes=" +
            full.length
        );

        check(
            declaredSize ===
            record.fullSize,
            "[capture] declared size mismatch seq=" +
            record.sequence
        );

        check(
            full.length ===
            record.fullSize,
            "[capture] parsed size mismatch seq=" +
            record.sequence
        );

        const steam =
            extractSteamBody(full);

        console.log(
            "[capture] seq=" +
            record.sequence +
            " steam.proto_header.bytes=" +
            steam.protoHeaderLength
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " steam.body.offset=" +
            steam.bodyOffset
        );

        const envelope =
            extractClientFromGc(
                steam.body,
                record.messageType
            );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " field3.length_varint.bytes=" +
            envelope.payloadLengthBytes
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " gc.packet.bytes=" +
            envelope.gcPacket.length
        );

        check(
            envelope.payloadLengthBytes ===
            record.lengthVarintBytes,
            "[capture] payload length varint mismatch seq=" +
            record.sequence
        );

        const body =
            extractGcBody(
                envelope.gcPacket,
                record.messageType,
                record.bodySize
            );

        const wrapper =
            full.length -
            body.length;

        check(
            wrapper ===
            record.wrapperSize,
            "[capture] wrapper fingerprint mismatch seq=" +
            record.sequence
        );

        const fingerprint =
            fnv1a32(body);

        check(
            fingerprint ===
            record.fingerprint,
            "[capture] body fingerprint mismatch seq=" +
            record.sequence
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " wrapper.bytes=" +
            wrapper
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " body.bytes=" +
            body.length
        );

        console.log(
            "[capture] seq=" +
            record.sequence +
            " fnv1a32=" +
            fingerprint
        );

        bodies.push(body);
    }

    check(
        bodies.length === 4,
        "[capture] expected four validated bodies"
    );

    console.log("");
    console.log(
        "[capture] ALL FOUR RECORDS VALIDATED"
    );

    /*
     * =========================================================
     * DISCOVER REAL 9100 TRANSPORT
     * =========================================================
     */

    const transport =
        find9100TransportCall(
            routeText
        );

    console.log("");
    console.log(
        "[route] UNIQUE 9100 TRANSPORT FOUND"
    );

    console.log(
        "[route] callee=" +
        transport.callee
    );

    console.log(
        "[route] args=" +
        transport.args.length
    );

    console.log(
        "[route] messageArgIndex=" +
        transport.messageArgIndex
    );

    console.log(
        "[route] payloadArgIndex=" +
        transport.payloadArgIndex
    );

    for (
        let index = 0;
        index < transport.args.length;
        index++
    ) {
        console.log(
            "[route] arg[" +
            index +
            "]=" +
            transport.args[index]
                .replace(
                    /\s+/g,
                    " "
                )
                .substring(
                    0,
                    400
                )
        );
    }

    console.log(
        "[route] call=" +
        transport.callText
            .replace(
                /\s+/g,
                " "
            )
            .substring(
                0,
                800
            )
    );

    /*
     * =========================================================
     * GENERATE PATCH
     * =========================================================
     */

    const replayBlock =
        buildReplayBlock(
            transport,
            bodies[0],
            bodies[1],
            bodies[2],
            bodies[3]
        );

    /*
     * Original working 9100 remains untouched.
     * Captured SO sequence is inserted immediately afterwards.
     */
    const patchedRoute =
        routeText.substring(
            0,
            transport.end
        ) +
        replayBlock +
        routeText.substring(
            transport.end
        );

    check(
        patchedRoute !== routeText,
        "[route] patch produced no changes"
    );

    check(
        patchedRoute.indexOf(
            PATCH_BEGIN
        ) >= 0,
        "[route] BEGIN marker missing"
    );

    check(
        patchedRoute.indexOf(
            PATCH_END
        ) >= 0,
        "[route] END marker missing"
    );

    check(
        patchedRoute.indexOf(
            transport.callText
        ) >= 0,
        "[route] original 9100 call changed"
    );

    const patchStart =
        patchedRoute.indexOf(
            PATCH_BEGIN
        );

    check(
        patchStart >= transport.end,
        "[route] replay not inserted after 9100"
    );

    check(
        patchedRoute.indexOf(
            "realPostStart105",
            patchStart
        ) >= 0,
        "[route] seq105 payload missing"
    );

    check(
        patchedRoute.indexOf(
            "realPostStart106",
            patchStart
        ) >= 0,
        "[route] seq106 payload missing"
    );

    check(
        patchedRoute.indexOf(
            "realPostStart107",
            patchStart
        ) >= 0,
        "[route] seq107 payload missing"
    );

    check(
        patchedRoute.indexOf(
            "realPostStart108",
            patchStart
        ) >= 0,
        "[route] seq108 payload missing"
    );

    console.log("");
    console.log(
        "[route] GENERATED PATCH VALIDATED"
    );

    console.log(
        "[route] transport shape cloned from existing 9100"
    );

    /*
     * =========================================================
     * BACKUP
     *
     * FIRST filesystem modification.
     * =========================================================
     */

    if (
        !fs.existsSync(
            BACKUP_DIR
        )
    ) {
        fs.mkdirSync(
            BACKUP_DIR,
            {
                recursive: true
            }
        );
    }

    const backupPath =
        createBackupPath();

    fs.copyFileSync(
        ROUTE_FILE,
        backupPath
    );

    console.log("");
    console.log(
        "[backup] created:"
    );

    console.log(
        "  " +
        backupPath
    );

    /*
     * =========================================================
     * SINGLE TARGET WRITE
     * =========================================================
     */

    fs.writeFileSync(
        ROUTE_FILE,
        patchedRoute,
        "utf8"
    );

    const reread =
        fs.readFileSync(
            ROUTE_FILE,
            "utf8"
        );

    check(
        reread === patchedRoute,
        "[route] post-write verification failed"
    );

    console.log("");
    console.log(
        "[patch] modified ONLY:"
    );

    console.log(
        "  " +
        ROUTE_FILE
    );

    console.log("");
    console.log(
        "[patch] original 9100 transport preserved"
    );

    console.log(
        "[patch] appended:"
    );

    console.log(
        "  105 -> 24 -> 34 bytes"
    );

    console.log(
        "  106 -> 24 -> 83 bytes -> REAL captured type_id=101"
    );

    console.log(
        "  107 -> 26 -> 243 bytes -> REAL captured type_id=105"
    );

    console.log(
        "  108 -> 26 -> 74 bytes -> REAL captured type_id=101"
    );

    console.log("");
    console.log(
        "[patch] NO synthetic type_id=101 placeholder"
    );

    console.log("");
    console.log(
        "[patch] expected runtime:"
    );

    console.log(
        "  9131 -> 26 -> 9132 -> 9100 -> 24 -> 24 -> 26 -> 26"
    );

    console.log("");
    console.log(
        "[patch] SUCCESS"
    );
}

main();