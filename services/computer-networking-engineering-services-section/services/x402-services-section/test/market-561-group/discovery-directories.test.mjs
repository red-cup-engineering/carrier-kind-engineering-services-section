import assert from "node:assert/strict";
import test from "node:test";
import { registerWithDirectories, registerWithDirectory, sellerOrigin } from "../../apps/market-561-group/src/discovery-directories.mjs";

test("each directory receives the bare origin in its own body shape", async () => {
  const sent = [];
  const fetchImpl = async (url, init) => { sent.push([url, JSON.parse(init.body)]); return new Response(JSON.stringify({ ok: true }), { status: 201 }); };
  const receipts = await registerWithDirectories({ origin: "https://market.561.group/", fetchImpl });
  assert.deepEqual(sent, [
    ["https://true402.dev/api/v1/services/register", { url: "https://market.561.group" }],
    ["https://agent402.tools/api/index/register", { origin: "https://market.561.group" }],
  ]);
  assert.deepEqual(receipts.map((receipt) => [receipt.directory, receipt.status]), [["true402", 201], ["agent402", 201]]);
});

test("a directory that refuses is reported without stopping the others", async () => {
  const fetchImpl = async (url) => url.includes("true402") ? new Response("busy", { status: 503 }) : new Response("{}", { status: 200 });
  const receipts = await registerWithDirectories({ origin: "https://market.561.group", fetchImpl });
  assert.equal(receipts[0].type, "X402DirectoryRegistrationRefusal");
  assert.match(receipts[0].error, /HTTP 503: busy/u);
  assert.equal(receipts[1].type, "X402DirectoryRegistrationReceipt");
});

test("only an HTTPS scheme-and-host origin is registered", async () => {
  assert.equal(sellerOrigin("https://market.561.group/"), "https://market.561.group");
  assert.throws(() => sellerOrigin("http://market.561.group"), /HTTPS/u);
  assert.throws(() => sellerOrigin("https://market.561.group/v1/catalog"), /scheme and host/u);
  await assert.rejects(registerWithDirectory("nowhere", { origin: "https://market.561.group" }), /unknown discovery directory/u);
});
