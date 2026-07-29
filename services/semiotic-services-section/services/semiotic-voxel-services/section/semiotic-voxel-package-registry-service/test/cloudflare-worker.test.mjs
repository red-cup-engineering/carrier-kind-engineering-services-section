import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/cloudflare-worker.mjs";

const token = "t".repeat(64);
const metadata = {
  name: "@red-cup-engineering/example",
  versions: {
    "1.0.0": {
      dist: { tarball: "http://127.0.0.1:4873/tarballs/red-cup-engineering/example/-/example-1.0.0.tgz" },
    },
  },
};

function environment() {
  return {
    REGISTRY_TOKEN: token,
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/registry-receipt.json") return Response.json({ packages: [{}, {}] });
        if (path === "/metadata/%2540red-cup-engineering%252Fexample.json") return Response.json(metadata);
        if (path.endsWith(".tgz")) return new Response("artifact");
        return new Response("missing", { status: 404 });
      },
    },
  };
}

test("health is public and reports the deployed snapshot", async () => {
  const response = await worker.fetch(new Request("https://registry.example/healthz"), environment());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", type: "SemioticVoxelPackageRegistry", packages: 2 });
});

test("package metadata and artifacts require the registry bearer token", async () => {
  const denied = await worker.fetch(new Request("https://registry.example/@red-cup-engineering%2Fexample"), environment());
  assert.equal(denied.status, 401);
  const headers = { authorization: `Bearer ${token}` };
  const response = await worker.fetch(new Request("https://registry.example/@red-cup-engineering%2Fexample", { headers }), environment());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.versions["1.0.0"].dist.tarball, "https://registry.example/tarballs/red-cup-engineering/example/-/example-1.0.0.tgz");
  const artifact = await worker.fetch(new Request(body.versions["1.0.0"].dist.tarball, { headers }), environment());
  assert.equal(await artifact.text(), "artifact");
});
