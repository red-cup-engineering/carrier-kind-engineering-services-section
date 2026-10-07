import { assertCookieName, parseCookieHeader, serializeSetCookie } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue, unsignCookieValue } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
export function getCookie(req, name) {
    assertCookieName(name);
    return parseCookieHeader(req.headers.cookie)[name] ?? null;
}
export function setCookie(res, name, value, options = {}) {
    const cookie = serializeSetCookie(name, value, options);
    appendSetCookie(res, cookie);
    return cookie;
}
export function appendSetCookie(res, cookie) {
    const existing = res.getHeader("Set-Cookie");
    if (existing === undefined) {
        res.setHeader("Set-Cookie", cookie);
    } else if (Array.isArray(existing)) {
        res.setHeader("Set-Cookie", [
            ...existing.map(String),
            cookie
        ]);
    } else {
        res.setHeader("Set-Cookie", [
            String(existing),
            cookie
        ]);
    }
}
export function deleteCookie(res, name, options = {}) {
    return setCookie(res, name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0
    });
}
export function setSignedCookie(res, name, value, secret, options = {}) {
    return setCookie(res, name, signCookieValue(value, secret, name), options);
}
export function getSignedCookie(req, name, secret) {
    const value = getCookie(req, name);
    return value === null ? null : unsignCookieValue(value, secret, name);
}
export function readCookie(request, name) {
    assertCookieName(name);
    return parseCookieHeader(request.headers.get("cookie") ?? undefined)[name] ?? null;
}
export function readSignedCookie(request, name, secret) {
    const value = readCookie(request, name);
    return value === null ? null : unsignCookieValue(value, secret, name);
}
export function signedSetCookie(name, value, secret, options = {}) {
    return serializeSetCookie(name, signCookieValue(value, secret, name), options);
}
export function clearingSetCookie(name, options = {}) {
    return serializeSetCookie(name, "", {
        ...options,
        expires: new Date(0),
        maxAge: 0
    });
}
