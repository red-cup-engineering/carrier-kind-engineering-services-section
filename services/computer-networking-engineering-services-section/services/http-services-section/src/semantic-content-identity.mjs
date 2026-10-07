import {
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";

function base64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function json(value, init = {}) {
  return Response.json(value, init);
}

export function createSemanticContentIdentityHandler({ manifest }) {
  if (typeof manifest !== "string") throw new TypeError("manifest must be a string");
  const headers = {
    "content-type": "application/json",
    "x-capability-manifest": manifest,
  };

  return async function handleSemanticContentIdentity(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/health") {
      return json({ ok: true, manifest }, { headers });
    }
    if (request.method === "POST" && pathname === "/invoke") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "malformed-json" }, { status: 400, headers });
      }
      if (!Object.hasOwn(body, "content") || Object.keys(body).length !== 1) {
        return json({ error: "exactly-one-content-carrier-is-required" }, { status: 400, headers });
      }
      try {
        const identity = identifyNormalizedSemanticContent(body.content);
        return json({ ...identity, bytes: base64(identity.bytes) }, { headers });
      } catch (error) {
        if (error instanceof TypeError) {
          return json({ error: error.code ?? "non-relational-content", message: error.message }, { status: 422, headers });
        }
        throw error;
      }
    }
    return json({ error: "not-found", manifest }, { status: 404, headers });
  };
}
