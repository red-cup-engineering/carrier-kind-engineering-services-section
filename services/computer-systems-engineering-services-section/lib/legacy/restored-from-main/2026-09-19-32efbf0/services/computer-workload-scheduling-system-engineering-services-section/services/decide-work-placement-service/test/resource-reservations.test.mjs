import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createGcsTransactionalOperationStore } from "@red-cup-engineering/gcloud-runtime-authorities-service";
import { createWorkResourceReservations, evaluateWorkResourceControl } from "../src/resource-reservations.mjs";

const amount = (n, d = 1) => ({ numerator: String(n), denominator: String(d) });
const row = (n, resource = "requests", unit = "request", d = 1) => ({ resource, unit, amount: amount(n, d) });
const zeroCashControl = {
  type: "WorkResourceFinancialControl", costState: "observed", costEvidenceIdentity: "evidence:zero-cost",
  costObservedAt: "2026-09-07T00:00:00Z", costValidUntil: "2026-09-08T00:00:00Z",
  consideration: [{ kind: "currency", asset: "urn:currency:usd", unit: "cent", amount: amount(0) }],
  billing: { status: "not-required" }, meterEvidenceIdentity: "evidence:meter",
  meterObservedAt: "2026-09-07T00:00:00Z", meterValidUntil: "2026-09-08T00:00:00Z",
};
const binding = { providerIdentity: "provider:test", accountIdentity: "account:test", windowIdentity: "window:test",
  evidenceIdentity: "evidence:test", observedAt: "2026-09-07T00:00:00Z", validFrom: "2026-09-07T00:00:00Z",
  validUntil: "2026-09-08T00:00:00Z", resetsAt: "2026-09-08T00:00:00Z", availableResources: [row(1), row(100, "output-tokens", "token")], financialControl: zeroCashControl };
const request = (id, action = "reserve", extra = {}) => ({ type: "WorkResourceReservationRequest",
  reservationId: id, action, providerIdentity: binding.providerIdentity, accountIdentity: binding.accountIdentity,
  windowIdentity: binding.windowIdentity, evaluatedAt: "2026-09-07T01:00:00Z", resources: [row(1)], ...extra });

function memoryFixture() {
  const records = new Map();
  return { records, async get(key) { return structuredClone(records.get(key)); },
    async compareAndSet(key, version, value) {
      if ((records.get(key)?.version ?? null) !== version) throw Error("stale expected version");
      const result = { ...structuredClone(value), version: String(Number(version ?? 0) + 1) };
      records.set(key, result); return result;
    } };
}

test("simultaneous deterministic and inferential reservations cannot exceed one exact account window", async () => {
  const store = memoryFixture();
  const a = createWorkResourceReservations({ store, binding }), b = createWorkResourceReservations({ store, binding });
  const results = await Promise.all([a.apply(request("deterministic-job")), b.apply(request("inference-job"))]);
  assert.deepEqual(results.map(({ disposition }) => disposition).sort(), ["held", "refused"]);
  assert.equal(results.find(({ disposition }) => disposition === "refused").reason, "resource-quota-exhausted");
});

test("exact fractions, provider/account/window isolation, and resource dimensions share the same admission", async () => {
  const store = memoryFixture();
  const fractional = { ...binding, availableResources: [row(1, "cpu", "second")] };
  const owner = createWorkResourceReservations({ store, binding: fractional });
  assert.equal((await owner.apply(request("one", "reserve", { resources: [row(1, "cpu", "second", 3)] }))).disposition, "held");
  assert.equal((await owner.apply(request("two", "reserve", { resources: [row(2, "cpu", "second", 3)] }))).disposition, "held");
  assert.equal((await owner.apply(request("three", "reserve", { resources: [row(1, "cpu", "second", 3)] }))).reason, "resource-quota-exhausted");
  assert.equal((await owner.apply(request("unit", "reserve", { resources: [row(1, "cpu", "minute")] }))).reason, "resource-dimension-not-admitted");
  for (const field of ["providerIdentity", "accountIdentity", "windowIdentity"]) {
    const other = { ...fractional, [field]: "other:" + field };
    assert.equal((await createWorkResourceReservations({ store, binding: other }).apply(request(field, "reserve", { [field]: other[field], resources: [row(1, "cpu", "second")] }))).disposition, "held");
  }
});

test("release returns only unused holds; uncertain attempts remain charged and replay is idempotent", async () => {
  const owner = createWorkResourceReservations({ store: memoryFixture(), binding });
  assert.equal((await owner.apply(request("first"))).disposition, "held");
  assert.equal((await owner.apply(request("first"))).disposition, "held");
  assert.equal((await owner.apply(request("first", "reserve", { resources: [row(0)] }))).reason, "resource-reservation-id-reused");
  assert.equal((await owner.apply(request("first", "release"))).disposition, "released");
  assert.equal((await owner.apply(request("first"))).reason, "resource-reservation-id-reused");
  assert.equal((await owner.apply(request("next"))).disposition, "held");
  assert.equal((await owner.apply(request("next", "attempt"))).disposition, "attempted");
  assert.equal((await owner.apply(request("next", "attempt"))).reason, "resource-execution-already-claimed");
  assert.equal((await owner.apply(request("next", "release"))).reason, "resource-attempt-conservatively-charged");
  assert.equal((await owner.apply(request("last"))).reason, "resource-quota-exhausted");
});

test("measured settlement releases only known unused resources and retains unmeasured dimensions", async () => {
  const owner = createWorkResourceReservations({ store: memoryFixture(), binding });
  await owner.apply(request("job", "reserve", { resources: binding.availableResources }));
  await owner.apply(request("job", "attempt"));
  const settle = request("job", "settle", { measuredResources: [row(30, "output-tokens", "token")] });
  assert.equal((await owner.apply(settle)).disposition, "settled");
  assert.equal((await owner.apply(settle)).disposition, "settled");
  assert.equal((await owner.apply(request("tokens", "reserve", { resources: [row(70, "output-tokens", "token")] }))).disposition, "held");
  assert.equal((await owner.apply(request("requests"))).reason, "resource-quota-exhausted");
  assert.equal((await owner.apply(request("forged", "reserve", { accountIdentity: "caller:minted" }))).reason, "resource-account-binding-mismatch");
});

test("stale windows, changed capacity anchors, and measurements above reservations refuse", async () => {
  const store = memoryFixture(), owner = createWorkResourceReservations({ store, binding });
  assert.equal((await owner.apply(request("stale", "reserve", { evaluatedAt: binding.resetsAt }))).reason, "resource-availability-evidence-not-current");
  await owner.apply(request("job"));
  const amplified = createWorkResourceReservations({ store, binding: { ...binding, availableResources: [row(99)] } });
  assert.equal((await amplified.apply(request("amplified"))).reason, "resource-capacity-anchor-mismatch");
  await owner.apply(request("job", "attempt"));
  assert.equal((await owner.apply(request("job", "settle", { measuredResources: [row(2)] }))).reason, "resource-measurement-outside-reservation");
});

test("candidate, unmetered, expired, and unauthorized paid capacity never reserve", async () => {
  const owner = (financialControl) => createWorkResourceReservations({ store: memoryFixture(), binding: { ...binding, financialControl } });
  assert.equal((await owner({ ...zeroCashControl, costState: "candidate" }).apply(request("candidate"))).reason, "resource-cost-is-candidate");
  assert.equal((await owner({ ...zeroCashControl, meterValidUntil: "2026-09-07T01:00:00Z" }).apply(request("meter-expired"))).reason, "resource-meter-evidence-not-current");
  const paidObserved = { ...zeroCashControl, consideration: [{ kind: "currency", asset: "urn:currency:usd", unit: "cent", amount: amount(1) }] };
  assert.equal((await owner(paidObserved).apply(request("observed-paid"))).reason, "resource-cost-not-committed");
  const paidCommitted = { ...paidObserved, costState: "committed" };
  assert.equal((await owner(paidCommitted).apply(request("committed-without-authority"))).reason, "resource-billing-authority-not-admitted");
  const authorized = { ...paidCommitted, billing: { status: "authorized", authorityIdentity: "authorization:fixture", validUntil: "2026-09-08T00:00:00Z" } };
  assert.equal((await owner(authorized).apply(request("committed-authorized"))).disposition, "held");
});

test("resource control makes candidate capacity visible but not executable", () => {
  const candidate = { ...binding, financialControl: { ...zeroCashControl, costState: "candidate" } };
  const result = evaluateWorkResourceControl(candidate, "2026-09-07T01:00:00Z");
  assert.equal(result.disposition, "refused");
  assert.equal(result.reason, "resource-cost-is-candidate");
});

test("read-only availability observes the active charges without conflating resource dimensions", async () => {
  const store = memoryFixture(), owner = createWorkResourceReservations({ store, binding });
  const empty = await owner.observe({ evaluatedAt: "2026-09-07T01:00:00Z" });
  assert.equal(empty.disposition, "observed");
  assert.deepEqual(empty.availableResources, [row(100, "output-tokens", "token"), row(1)]);
  await owner.apply(request("job", "reserve", { resources: [row(1, "output-tokens", "token", 3)] }));
  const held = await owner.observe({ evaluatedAt: "2026-09-07T01:00:00Z" });
  assert.equal(held.disposition, "observed");
  assert.deepEqual(held.availableResources, [row(299, "output-tokens", "token", 3), row(1)]);
  assert.equal((await owner.observe({ evaluatedAt: binding.resetsAt })).reason, "resource-availability-evidence-not-current");
  const amplified = createWorkResourceReservations({ store, binding: { ...binding, availableResources: [row(99)] } });
  assert.equal((await amplified.observe({ evaluatedAt: "2026-09-07T01:00:00Z" })).reason, "resource-capacity-anchor-mismatch");
  assert.equal(store.records.size, 1);
});

test("uncertain committed CAS response is reconciled by reread without issuing a second hold", async () => {
  const store = memoryFixture(), write = store.compareAndSet;
  let uncertain = true;
  store.compareAndSet = async (...args) => { const result = await write(...args); if (uncertain) { uncertain = false; throw Error("connection lost"); } return result; };
  const owner = createWorkResourceReservations({ store, binding });
  assert.equal((await owner.apply(request("job"))).disposition, "held");
  assert.equal([...store.records.values()][0].reservations.length, 1);
  uncertain = true;
  assert.equal((await owner.apply(request("job", "attempt"))).disposition, "attempted");
  assert.equal((await owner.apply(request("job", "attempt"))).reason, "resource-execution-already-claimed");
});

test("independent controllers cannot both claim execution for the same reservation id", async () => {
  const store = memoryFixture();
  const a = createWorkResourceReservations({ store, binding }), b = createWorkResourceReservations({ store, binding });
  await a.apply(request("duplicate-job"));
  const claims = await Promise.all([a.apply(request("duplicate-job", "attempt")), b.apply(request("duplicate-job", "attempt"))]);
  assert.deepEqual(claims.map(x => x.disposition).sort(), ["attempted", "refused"]);
  assert.equal(claims.find(x => x.disposition === "refused").reason, "resource-execution-already-claimed");
});

async function gcsFixture(t) {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE objects (name TEXT PRIMARY KEY, generation INTEGER NOT NULL, body TEXT NOT NULL)");
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://fixture");
    const name = url.searchParams.get("name") ?? decodeURIComponent(url.pathname.split("/o/")[1] ?? "");
    if (req.method === "POST") {
      let body = ""; for await (const chunk of req) body += chunk;
      database.exec("BEGIN IMMEDIATE");
      try {
        const old = database.prepare("SELECT generation FROM objects WHERE name=?").get(name);
        if (String(old?.generation ?? 0) !== url.searchParams.get("ifGenerationMatch")) {
          database.exec("ROLLBACK"); res.writeHead(412).end(); return;
        }
        const generation = (old?.generation ?? 0) + 1;
        database.prepare("INSERT INTO objects VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET generation=excluded.generation, body=excluded.body").run(name, generation, body);
        database.exec("COMMIT"); res.end(JSON.stringify({ generation: String(generation) }));
      } catch (error) { database.exec("ROLLBACK"); res.writeHead(500).end(); }
      return;
    }
    const found = database.prepare("SELECT * FROM objects WHERE name=?").get(name);
    if (!found) { res.writeHead(404).end(); return; }
    if (url.searchParams.get("alt") === "media") { res.end(found.body); return; }
    res.end(JSON.stringify({ generation: String(found.generation) }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { await new Promise(resolve => server.close(resolve)); database.close(); });
  return "http://127.0.0.1:" + server.address().port;
}

test("independent Node processes contend through the published GCS CAS adapter and one transactional fixture", async (t) => {
  const endpoint = await gcsFixture(t);
  const code = `import { createGcsTransactionalOperationStore } from "@red-cup-engineering/gcloud-runtime-authorities-service";
    import { createWorkResourceReservations } from "./src/resource-reservations.mjs";
    const store = createGcsTransactionalOperationStore({bucket:"fixture", request:(url, init)=>fetch(process.env.TEST_ENDPOINT + new URL(url).pathname + new URL(url).search,init)});
    const owner=createWorkResourceReservations({store,binding:JSON.parse(process.env.TEST_BINDING)});
    console.log(JSON.stringify(await owner.apply(JSON.parse(process.env.TEST_REQUEST))));`;
  const run = (id, action = "reserve") => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", code], { cwd: new URL("..", import.meta.url),
      env: { ...process.env, TEST_ENDPOINT: endpoint, TEST_BINDING: JSON.stringify(binding), TEST_REQUEST: JSON.stringify(request(id, action)) }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = ""; child.stdout.on("data", x => stdout += x); child.stderr.on("data", x => stderr += x);
    child.on("error", reject); child.on("close", code => code === 0 ? resolve(JSON.parse(stdout)) : reject(Error(stderr)));
  });
  const results = await Promise.all([run("process:deterministic"), run("process:inferential")]);
  assert.deepEqual(results.map(x => x.disposition).sort(), ["held", "refused"]);
  const store = createGcsTransactionalOperationStore({ bucket: "fixture", request: (url, init) => fetch(endpoint + new URL(url).pathname + new URL(url).search, init) });
  const owner = createWorkResourceReservations({ store, binding });
  assert.equal((await owner.apply(request("third-process"))).reason, "resource-quota-exhausted");
  const winner = results.find(x => x.disposition === "held").reservationId;
  const claims = await Promise.all([run(winner, "attempt"), run(winner, "attempt")]);
  assert.deepEqual(claims.map(x => x.disposition).sort(), ["attempted", "refused"]);
  assert.equal(claims.find(x => x.disposition === "refused").reason, "resource-execution-already-claimed");
});
