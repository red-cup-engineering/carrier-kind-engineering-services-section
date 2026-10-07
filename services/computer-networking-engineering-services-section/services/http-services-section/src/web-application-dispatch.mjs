// Moved down from computer-web-server (application.mjs): matching a resource
// by path and dispatching one HTTP request against a plain `{ resources,
// middlewares, onRequest }` specification is generic routing, independent of
// the Fetch-handler wrapping in web-application.mjs and of any transport.
// TUFTE and computer-web-server's native (non-Fetch) transport both dispatch
// requests the same way, so this is one implementation, not two.
import { appendEntries, claimOf } from "./request-trace.mjs";
import { routeAdmissionReport, routeAllowHeader, routeMethodAllowed } from "./route-admission.mjs";
export function matchResource(resource, path, context) {
    const match = resource.match;
    if (typeof match === "function") {
        const result = match(path, context);
        return result ? typeof result === "object" ? result : {} : false;
    }
    if (match instanceof RegExp) {
        const result = new RegExp(match.source, match.flags.replace(/[gy]/g, "")).exec(path);
        return result ? {
            ...result.groups
        } : false;
    }
    if (!match.includes(":")) return match === path ? {} : false;
    const parts = match.split("/"), actual = path.split("/");
    if (parts.length !== actual.length) return false;
    const params = {};
    for(let index = 0; index < parts.length; index++){
        const part = parts[index], value = actual[index];
        if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(value);
        else if (part !== value) return false;
    }
    return params;
}
export async function dispatchApplication(application, context, request, effects) {
    async function stages(stages) {
        for (const stage of stages){
            const result = await stage(context);
            if (Array.isArray(result)) {
                context.trace = appendEntries(context.trace, result);
            } else if (result === true || await effects.accept(result, context)) return true;
        }
        return false;
    }
    if (application.onRequest && await stages([
        application.onRequest
    ])) return;
    if (await effects.preflight?.(context)) return;
    if (await stages(application.middlewares ?? [])) return;
    const method = claimOf(context.trace, "method") ?? request.method;
    let selected = null;
    let firstMatch = null;
    const matchingMethods = new Set();
    let unrestricted = false;
    try {
        decodeURI(context.url.pathname);
        for (const resource of application.resources ?? []){
            const params = matchResource(resource, context.url.pathname, context);
            if (params === false) continue;
            firstMatch ??= {
                resource,
                params
            };
            if (resource.methods) for (const allowed of resource.methods)matchingMethods.add(allowed);
            else unrestricted = true;
            if (!selected && routeMethodAllowed(resource, method)) selected = {
                resource,
                params
            };
            if (selected && method.toUpperCase() !== "OPTIONS") break;
        }
    } catch (error) {
        if (!(error instanceof URIError)) throw error;
        await effects.refuse({
            status: 400,
            title: "Bad Request"
        }, context);
        return;
    }
    selected ??= firstMatch;
    const found = selected?.resource ?? null;
    const allow = firstMatch && !unrestricted ? routeAllowHeader({
        methods: [
            ...matchingMethods
        ]
    }) : null;
    if (selected) {
        const resource = selected.resource;
        const route = resource.route ?? (typeof resource.match === "string" ? resource.match : resource.match instanceof RegExp ? resource.match.toString() : "function");
        context.params = Object.freeze(selected.params);
        context.route = context.routeTemplate = context.matchedRoute = route;
        if (resource.id !== undefined) context.routeId = resource.id;
        if (resource.name !== undefined) context.routeName = resource.name;
        effects.matched?.(resource, context);
    }
    if (found && method.toUpperCase() === "OPTIONS" && found.methods) {
        await effects.refuse({
            status: 204,
            title: "",
            ...allow ? {
                headers: {
                    Allow: allow
                }
            } : {}
        }, context);
        return;
    }
    const admission = routeAdmissionReport({
        trace: context.trace,
        resource: found,
        method,
        ...request.accept !== undefined ? {
            accept: request.accept
        } : {},
        ...request.acceptLanguage !== undefined ? {
            acceptLanguage: request.acceptLanguage
        } : {}
    });
    if (admission.negotiatedType !== undefined) context.negotiatedType = admission.negotiatedType;
    if (admission.negotiatedLanguage !== undefined) context.negotiatedLanguage = admission.negotiatedLanguage;
    effects.admitted?.(context);
    const settled = admission.settled;
    if (settled.value !== "potential") {
        const status = settled.value === "absurd" ? 404 : settled.value === "stable" ? 500 : admission.denial === "method" ? 405 : admission.denial === "accept" || admission.denial === "accept-language" ? 406 : 403;
        const title = {
            404: "Not Found",
            500: "Contradicted Request Evidence",
            405: "Method Not Allowed",
            406: "Not Acceptable",
            403: "Forbidden"
        }[status];
        await effects.refuse({
            status,
            title,
            ...allow && status === 405 ? {
                headers: {
                    Allow: allow
                }
            } : {},
            ...status === 500 ? {
                evidence: settled.section.contradicted
            } : {}
        }, context);
        return;
    }
    context.trace = settled.trace;
    if (await stages(found.middlewares ?? [])) return;
    await effects.accept(await found.handler(context), context);
}
