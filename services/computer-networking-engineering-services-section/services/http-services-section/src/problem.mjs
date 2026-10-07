import { send } from "./response.mjs";
export class HttpProblem extends Error {
    status;
    type;
    title;
    detail;
    instance;
    headers;
    extensions;
    constructor(status, title = statusTitle(status), options = {}){
        super(options.detail ?? title, {
            cause: options.cause
        });
        this.name = "HttpProblem";
        this.status = normalizeStatus(status);
        this.type = options.type ?? "about:blank";
        this.title = title;
        this.detail = options.detail;
        this.instance = options.instance;
        this.headers = Object.freeze({
            ...options.headers ?? {}
        });
        this.extensions = Object.freeze({
            ...options.extensions ?? {}
        });
    }
}
export function httpProblem(status, title = statusTitle(status), options = {}) {
    return new HttpProblem(status, title, options);
}
export const problem = httpProblem;
export function isHttpProblem(value) {
    return value instanceof HttpProblem || typeof value === "object" && value !== null && typeof value.status === "number" && typeof value.title === "string";
}
export function problemFromError(error, options = {}) {
    if (error instanceof HttpProblem) return error;
    const bodyStatus = requestBodyProblemStatus(error);
    if (bodyStatus !== null) {
        return httpProblem(bodyStatus.status, bodyStatus.title, {
            detail: errorMessage(error),
            cause: error
        });
    }
    if (error instanceof SyntaxError) {
        return httpProblem(400, "Bad Request", {
            detail: error.message,
            cause: error
        });
    }
    return httpProblem(500, "Internal Server Error", {
        ...options.includeErrorDetail ? {
            detail: errorMessage(error)
        } : {},
        ...options.includeStack && error instanceof Error && error.stack ? {
            extensions: {
                stack: error.stack
            }
        } : {},
        cause: error
    });
}
export function problemDetails(input) {
    if (!(input instanceof HttpProblem)) {
        return Object.freeze({
            ...input
        });
    }
    const details = {
        type: input.type,
        title: input.title,
        status: input.status
    };
    if (input.detail !== undefined) details.detail = input.detail;
    if (input.instance !== undefined) details.instance = input.instance;
    for (const [key, value] of Object.entries(input.extensions)){
        if (value !== undefined && !reservedProblemKeys.has(key)) details[key] = value;
    }
    return Object.freeze(details);
}
export function problemRepr(input, options = {}) {
    const details = problemDetails(input);
    const headers = {
        ...options.headers ?? {},
        ...input instanceof HttpProblem ? input.headers : {}
    };
    const repr = {
        status: details.status,
        type: "application/problem+json; charset=utf-8",
        headers,
        cacheControl: options.cacheControl ?? {
            noStore: true
        },
        body: JSON.stringify(details)
    };
    if (options.security !== undefined) repr.security = options.security;
    return repr;
}
export async function sendProblem(req, res, input, options = {}) {
    if (options.now === undefined) throw new TypeError("sendProblem: options.now (a Date, or milliseconds since the epoch) is required");
    await send(req, res, problemRepr(input, options), options.now);
}
export function problemErrorHandler(options = {}) {
    return async (err, ctx)=>{
        if (ctx.res.headersSent) return;
        const source = problemFromError(err, options);
        const instance = resolveProblemInstance(ctx, options) ?? source.instance;
        const p = instance === source.instance ? source : httpProblem(source.status, source.title, {
            type: source.type,
            headers: source.headers,
            extensions: source.extensions,
            ...source.detail !== undefined ? {
                detail: source.detail
            } : {},
            ...instance !== undefined ? {
                instance
            } : {},
            cause: err
        });
        await sendProblem(ctx.req, ctx.res, p, options);
    };
}
export function resolveProblemInstance(ctx, options = {}) {
    return typeof options.instance === "function" ? options.instance(ctx) : options.instance;
}
export function statusTitle(status) {
    return STATUS_TITLES[normalizeStatus(status)] ?? "HTTP Error";
}
function normalizeStatus(status) {
    return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function requestBodyProblemStatus(error) {
    if (!(error instanceof Error)) return null;
    if (error instanceof RangeError && /request body exceeded|decoded request body exceeded/.test(error.message)) {
        return {
            status: 413,
            title: "Payload Too Large"
        };
    }
    if (error instanceof TypeError && /unsupported request content-encoding|unsupported request charset|expected .* body, got/.test(error.message)) {
        return {
            status: 415,
            title: "Unsupported Media Type"
        };
    }
    if (error instanceof TypeError && /multipart.*boundary/.test(error.message)) {
        return {
            status: 400,
            title: "Bad Request"
        };
    }
    return null;
}
const reservedProblemKeys = new Set([
    "type",
    "title",
    "status",
    "detail",
    "instance"
]);
const STATUS_TITLES = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    409: "Conflict",
    410: "Gone",
    412: "Precondition Failed",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    422: "Unprocessable Content",
    429: "Too Many Requests",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout"
};
