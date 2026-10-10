/**
 * cool-uris — Cool URIs for the Semantic Web (W3C note): a subject identifier answers 303 See Other to the
 * representation the request negotiates, with every representation offered in a Link header.
 */
import { negotiateType } from "./negotiation.mjs";
import { linkHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/link";
function assertRepresentation(representation) {
    if (!representation.type)
        throw new TypeError("representation.type is required");
    if (!representation.path.startsWith("/"))
        throw new TypeError("representation.path must start with /");
}
function requireRepresentations(representations) {
    if (representations.length === 0)
        throw new TypeError("at least one representation is required");
    for (const representation of representations)
        assertRepresentation(representation);
}
function pathFor(pattern, subject, subjectParam = "subject") {
    const encoded = encodeURIComponent(subject);
    return pattern.replace(`:${subjectParam}`, encoded);
}
function absolute(path, requestUrl) {
    return new URL(path, requestUrl).href;
}
export function coolUriChoice(subject, accept, requestUrl, representations, opts = {}) {
    requireRepresentations(representations);
    if (!subject)
        throw new TypeError("subject is required");
    const types = representations.map((representation) => representation.type);
    const type = negotiateType(accept, types) ?? opts.defaultType ?? representations[0].type;
    const representation = representations.find((candidate) => candidate.type === type) ?? representations[0];
    const links = linkHeader(representations.map((candidate) => ({
        href: absolute(pathFor(candidate.path, subject, opts.subjectParam), requestUrl),
        rel: candidate.rel ?? "alternate",
        type: candidate.type,
    })));
    return {
        subject,
        type: representation.type,
        location: absolute(pathFor(representation.path, subject, opts.subjectParam), requestUrl),
        links,
    };
}
/** Negotiate a subject identifier into one of its published representations. */
export function coolUriResource(options) {
    const subjectPath = options.subjectPath ?? "/id/:subject";
    const subjectParam = options.subjectParam ?? "subject";
    requireRepresentations(options.representations);
    return { match: subjectPath, route: subjectPath, methods: ["GET"], handler: async ctx => {
        const subject = ctx.params[subjectParam];
        if (!subject || (options.exists && !await options.exists(subject))) {
            return { status: 404, type: "text/plain; charset=utf-8", body: "Not Found" };
        }
        const choice = coolUriChoice(subject, Array.isArray(ctx.req.headers.accept) ? ctx.req.headers.accept.join(", ") : ctx.req.headers.accept, ctx.url, options.representations, {
            subjectParam, ...(options.defaultType ? { defaultType: options.defaultType } : {}),
        });
        return { status: 303, type: "text/plain; charset=utf-8", body: `See Other: ${choice.location}\n`,
            headers: { location: choice.location, link: choice.links, vary: "Accept" },
            cacheControl: { visibility: "public", maxAge: 300 } };
    } };
}
