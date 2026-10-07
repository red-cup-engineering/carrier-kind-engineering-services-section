import { parseContentType } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
export class BodyReadError extends Error {
    status;
    code;
    constructor(status, code, message, options){
        super(message, options);
        this.name = "BodyReadError";
        this.status = status;
        this.code = code;
    }
}
function limit(value, fallback, name) {
    const selected = value ?? fallback;
    if (Number.isNaN(selected) || selected < 0) throw new RangeError(`${name} must be a non-negative number`);
    return selected;
}
function cancel(reader, reason) {
    void reader.cancel(reason).catch(()=>{});
}
export async function collectBody(stream, maximum, label, signal) {
    if (!stream) {
        signal?.throwIfAborted();
        return new Uint8Array(0);
    }
    const reader = stream.getReader();
    let rejectAbort;
    const aborted = new Promise((_resolve, reject)=>{
        rejectAbort = reject;
    });
    const abort = ()=>{
        cancel(reader, signal?.reason);
        rejectAbort(signal?.reason);
    };
    signal?.addEventListener("abort", abort, {
        once: true
    });
    const chunks = [];
    let size = 0;
    try {
        if (signal?.aborted) {
            cancel(reader, signal.reason);
            signal.throwIfAborted();
        }
        while(true){
            const result = await Promise.race([
                reader.read(),
                aborted
            ]);
            signal?.throwIfAborted();
            if (result.done) break;
            size += result.value.byteLength;
            if (size > maximum) throw new BodyReadError(413, "body-too-large", `${label} exceeded ${maximum} bytes`);
            chunks.push(result.value.slice());
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks){
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return bytes;
    } catch (error) {
        cancel(reader, error);
        if (error instanceof BodyReadError) throw error;
        if (signal?.aborted) throw signal.reason;
        throw new BodyReadError(400, "invalid-body", "could not read request body", {
            cause: error
        });
    } finally{
        signal?.removeEventListener("abort", abort);
        reader.releaseLock();
    }
}
export function contentCodings(value) {
    const raw = typeof value === "string" ? value : value?.join(",");
    const codings = (raw ?? "").split(",").map((part)=>part.trim().toLowerCase()).filter((part)=>part && part !== "identity");
    for (const coding of codings)if (![
        "br",
        "gzip",
        "deflate",
        "zstd"
    ].includes(coding)) throw new BodyReadError(415, "unsupported-content-coding", `unsupported request content-encoding: ${coding}`);
    return codings;
}
export async function readBodyStream(stream, options, decoder, defaultLimit, signal) {
    const maxBytes = limit(options.maxBytes, defaultLimit, "maxBytes");
    const maxEncodedBytes = limit(options.maxEncodedBytes, maxBytes, "maxEncodedBytes");
    const codings = options.decodeContentEncoding === false ? [] : contentCodings(options.contentEncoding);
    let bytes = await collectBody(stream, maxEncodedBytes, "request body", signal);
    for (const coding of [
        ...codings
    ].reverse())bytes = await collectBody(decoder(bytes, coding), maxBytes, "decoded request body", signal);
    if (bytes.byteLength > maxBytes) throw new BodyReadError(413, "body-too-large", `decoded request body exceeded ${maxBytes} bytes`);
    return bytes;
}
export function decodeBody(bytes, contentType) {
    const charset = (parseContentType(contentType)?.params["charset"] ?? "utf-8").toLowerCase();
    if (![
        "utf-8",
        "utf8",
        "us-ascii",
        "ascii",
        "iso-8859-1",
        "latin1"
    ].includes(charset)) throw new BodyReadError(415, "unsupported-charset", `unsupported request charset: ${charset}`);
    if ([
        "iso-8859-1",
        "latin1",
        "us-ascii",
        "ascii"
    ].includes(charset)) {
        if ((charset === "ascii" || charset === "us-ascii") && bytes.some((byte)=>byte > 127)) throw new BodyReadError(400, "invalid-body", "US-ASCII request body contains a non-ASCII octet");
        return Array.from(bytes, (byte)=>String.fromCharCode(byte)).join("");
    }
    try {
        return new TextDecoder("utf-8", {
            fatal: true
        }).decode(bytes);
    } catch (cause) {
        throw new BodyReadError(400, "invalid-body", "request body must contain valid UTF-8", {
            cause
        });
    }
}
export function mediaType(value, expected, required = true) {
    const parsed = parseContentType(value);
    if (!parsed && !required) return;
    const type = parsed?.type;
    const admitted = expected === "json" ? type === "application/json" || /^application\/[!#$%&'*+.^_`|~0-9a-z-]+\+json$/.test(type ?? "") : expected === "urlencoded" ? type === "application/x-www-form-urlencoded" : expected === "multipart" ? type === "multipart/form-data" : type === "multipart/form-data" || type === "application/x-www-form-urlencoded";
    const label = expected === "urlencoded" ? "application/x-www-form-urlencoded" : expected === "multipart" ? "multipart/form-data" : expected === "json" ? "application/json" : "form";
    if (!admitted) throw new BodyReadError(415, "unsupported-media-type", `expected ${label} body, got ${type ?? "missing content-type"}`);
    if (type === "multipart/form-data" && !parsed?.params["boundary"]) throw new BodyReadError(400, "invalid-form", "multipart/form-data boundary is required");
}
export function parseJson(text, options) {
    if (!text.trim() && "empty" in options) return options.empty;
    try {
        return JSON.parse(text);
    } catch (cause) {
        throw new BodyReadError(400, "invalid-json", "request body must be valid JSON", {
            cause
        });
    }
}
