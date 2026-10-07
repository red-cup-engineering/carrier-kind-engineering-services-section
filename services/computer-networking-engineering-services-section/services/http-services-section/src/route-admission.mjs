// Moved down from computer-web-server (route-admission.mjs): method/accept/
// accept-language admission for a matched route is generic HTTP routing
// semantics -- it depended only on this package's own negotiation and the
// request trace, never on anything web-server- or gui-server-specific.
import { negotiateType } from "./negotiation.mjs";
import { negotiateLanguage } from "./negotiation.mjs";
import { settleRequestTrace } from "./request-trace.mjs";
export function routeAllowedMethods(resource) {
    if (!resource?.methods) return null;
    const allowed = new Set(resource.methods.map((method)=>method.toUpperCase()));
    if (allowed.has("GET")) allowed.add("HEAD");
    allowed.add("OPTIONS");
    return Object.freeze([
        ...allowed
    ]);
}
export function routeAllowHeader(resource) {
    const allowed = routeAllowedMethods(resource);
    return allowed ? allowed.join(", ") : null;
}
export function routeMethodAllowed(resource, method) {
    const allowed = routeAllowedMethods(resource);
    return !allowed || allowed.includes(method.toUpperCase());
}
export function routeAdmissionJudgments(input) {
    const routePath = input.trace.id;
    if (!input.resource) {
        return {
            judgments: Object.freeze([
                {
                    name: "route",
                    value: "absurd",
                    reason: "no resource matched path",
                    path: routePath
                }
            ]),
            denial: "route",
            allow: null
        };
    }
    const allow = routeAllowHeader(input.resource);
    const method = input.method.toUpperCase();
    if (!routeMethodAllowed(input.resource, method)) {
        return {
            judgments: Object.freeze([
                {
                    name: "method",
                    value: "active",
                    reason: `method ${method} not admitted by [${allow ?? "all"}]`,
                    path: routePath
                }
            ]),
            denial: "method",
            allow
        };
    }
    const offered = input.resource.produces ?? [];
    const negotiatedType = offered.length ? negotiateType(input.accept, offered) : null;
    if (offered.length && !negotiatedType) {
        return {
            judgments: Object.freeze([
                {
                    name: "accept",
                    value: "active",
                    reason: `no admitted representation in [${offered.join(",")}]`,
                    path: routePath
                }
            ]),
            denial: "accept",
            allow
        };
    }
    const languages = input.resource.languages ?? [];
    const negotiatedLanguage = languages.length ? negotiateLanguage(input.acceptLanguage, languages) : null;
    if (languages.length && !negotiatedLanguage) {
        return {
            judgments: Object.freeze([
                {
                    name: "accept-language",
                    value: "active",
                    reason: `no admitted language in [${languages.join(",")}]`,
                    path: routePath
                }
            ]),
            denial: "accept-language",
            allow,
            ...negotiatedType !== null ? {
                negotiatedType
            } : {}
        };
    }
    return {
        judgments: Object.freeze([
            {
                name: "route",
                value: "potential",
                reason: "resource admitted for handling",
                path: routePath
            }
        ]),
        denial: null,
        allow,
        ...negotiatedType !== null ? {
            negotiatedType
        } : {},
        ...negotiatedLanguage !== null ? {
            negotiatedLanguage
        } : {}
    };
}
export function routeAdmissionReport(input) {
    const projection = routeAdmissionJudgments(input);
    const settled = settleRequestTrace(input.trace, projection.judgments);
    return Object.freeze({
        trace: input.trace,
        settled,
        judgments: projection.judgments,
        denial: projection.denial,
        allow: projection.allow,
        ...projection.negotiatedType !== undefined ? {
            negotiatedType: projection.negotiatedType
        } : {},
        ...projection.negotiatedLanguage !== undefined ? {
            negotiatedLanguage: projection.negotiatedLanguage
        } : {}
    });
}
