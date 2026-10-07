import { Readable } from "node:stream";
import { decompressStream, supportedCompressionCodings } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-coding";
import { parseContentType } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
import { parseMultipartForm } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { BodyReadError, readBodyStream, decodeBody, mediaType, parseJson } from "./body.mjs";
export { BodyReadError } from "./body.mjs";
const decode = (bytes, coding)=>{
    if (!supportedCompressionCodings().includes(coding)) throw new BodyReadError(415, "unsupported-content-coding", `unsupported request content-encoding: ${coding}`);
    return Readable.toWeb(Readable.from([
        bytes
    ]).pipe(decompressStream(coding)));
};
export async function readBody(req, options = {}) {
    const selected = typeof options === "number" ? {
        maxBytes: options,
        maxEncodedBytes: options
    } : options;
    const abortController = new AbortController();
    const abort = ()=>abortController.abort(new BodyReadError(400, "invalid-body", "request body was aborted"));
    req.once("aborted", abort);
    if (req.aborted) abort();
    try {
        return Buffer.from(await readBodyStream(Readable.toWeb(req).pipeThrough(new TransformStream({
            transform (chunk, controller) {
                controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
            }
        })), {
            ...selected,
            contentEncoding: selected.contentEncoding ?? req.headers?.["content-encoding"]
        }, decode, Infinity, abortController.signal));
    } finally{
        req.removeListener("aborted", abort);
    }
}
export async function readTextBody(req, options = {}) {
    return decodeBody(await readBody(req, options), options.contentType ?? req.headers["content-type"]);
}
export async function readJsonBody(req, options = {}) {
    return parseJson(decodeBody(await readBody(req, options)), {
        empty: undefined,
        ...options
    });
}
export async function readFormBody(req, options = {}) {
    mediaType(options.contentType ?? req.headers["content-type"], "urlencoded", false);
    return new URLSearchParams(await readTextBody(req, options));
}
export async function readMultipartBody(req, options = {}) {
    const contentType = options.contentType ?? req.headers["content-type"];
    mediaType(contentType, "multipart");
    return parseMultipartForm(await readBody(req, options), parseContentType(contentType).params["boundary"]);
}
