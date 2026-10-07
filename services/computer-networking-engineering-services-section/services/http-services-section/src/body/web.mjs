import { BodyReadError, readBodyStream, decodeBody, mediaType, parseJson } from "./body.mjs";
export { BodyReadError } from "./body.mjs";
export const DEFAULT_BODY_LIMIT = 1024 * 1024;
const decode = (bytes, coding)=>{
    let decoder;
    try {
        decoder = new DecompressionStream(coding);
    } catch (cause) {
        throw new BodyReadError(415, "unsupported-content-coding", `unsupported request content-encoding: ${coding}`, {
            cause
        });
    }
    return new Blob([
        bytes
    ]).stream().pipeThrough(decoder);
};
function optionsFor(request, options) {
    return {
        ...options,
        contentType: options.contentType ?? request.headers.get("content-type") ?? undefined,
        contentEncoding: options.contentEncoding ?? request.headers.get("content-encoding") ?? undefined
    };
}
export async function readBody(request, options = {}) {
    return readBodyStream(request.body, optionsFor(request, options), decode, DEFAULT_BODY_LIMIT, request.signal);
}
export async function readTextBody(request, options = {}) {
    const selected = optionsFor(request, options);
    return decodeBody(await readBody(request, selected), selected.contentType);
}
export async function readJsonBody(request, options = {}) {
    mediaType(optionsFor(request, options).contentType, "json");
    return parseJson(decodeBody(await readBody(request, options)), options);
}
export async function readFormBody(request, options = {}) {
    mediaType(optionsFor(request, options).contentType, "urlencoded");
    return new URLSearchParams(await readTextBody(request, options));
}
export async function readMultipartBody(request, options = {}) {
    mediaType(optionsFor(request, options).contentType, "multipart");
    return readFormDataBody(request, options);
}
export async function readFormDataBody(request, options = {}) {
    const selected = optionsFor(request, options);
    mediaType(selected.contentType, "form");
    const bytes = await readBody(request, selected);
    try {
        return await new Response(bytes, {
            headers: {
                "content-type": selected.contentType
            }
        }).formData();
    } catch (cause) {
        throw new BodyReadError(400, "invalid-form", "request body must be valid form data", {
            cause
        });
    }
}
