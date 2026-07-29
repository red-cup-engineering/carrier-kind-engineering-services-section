function unauthorized() {
  return new Response('{"error":"unauthorized"}\n', {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="Union package registry"',
    },
  });
}

function hasRegistryToken(request, expected) {
  if (typeof expected !== "string" || expected.length < 32) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  return new Request(url, { method: request.method, headers: request.headers });
}

function packageMetadataPath(pathname) {
  const decoded = decodeURIComponent(pathname.replace(/^\/+/, ""));
  if (!/^@[a-z0-9-]+\/[a-z0-9._-]+$/u.test(decoded)) return null;
  // The immutable snapshot deliberately uses encodeURIComponent(packageName)
  // as its filename. Workers Assets percent-encodes those literal percent
  // signs in the URL manifest, so the internal asset request is encoded twice.
  return `/metadata/${encodeURIComponent(encodeURIComponent(decoded))}.json`;
}

async function registryHealth(env) {
  const receipt = await env.ASSETS.fetch(new Request("https://assets.invalid/registry-receipt.json"));
  if (!receipt.ok) return new Response('{"status":"unavailable"}\n', { status: 503, headers: { "content-type": "application/json" } });
  const body = await receipt.json();
  return Response.json({
    status: "ok",
    type: "SemioticVoxelPackageRegistry",
    packages: Array.isArray(body.packages) ? body.packages.length : null,
  });
}

async function serveMetadata(request, env, path) {
  const asset = await env.ASSETS.fetch(assetRequest(request, path));
  if (!asset.ok || request.method === "HEAD") return asset;
  const metadata = await asset.json();
  const origin = new URL(request.url).origin;
  for (const version of Object.values(metadata.versions ?? {})) {
    if (typeof version?.dist?.tarball !== "string") continue;
    version.dist.tarball = new URL(new URL(version.dist.tarball).pathname, origin).href;
  }
  return Response.json(metadata, {
    headers: { "cache-control": "no-cache" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const { pathname } = new URL(request.url);
    if (pathname === "/healthz") return registryHealth(env);
    if (!hasRegistryToken(request, env.REGISTRY_TOKEN)) return unauthorized();
    const metadataPath = packageMetadataPath(pathname);
    if (metadataPath) return serveMetadata(request, env, metadataPath);
    return env.ASSETS.fetch(request);
  },
};
