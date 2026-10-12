import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { obligationsApp } from "../src/obligations.mjs";

// The real records, the real drivers and the real page, over fixtures for custody and for the services behind it.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = (() => { let dir = HERE; while (!existsSync(join(dir, "pnpm-workspace.yaml"))) dir = dirname(dir); return dir; })();
const under = (...parts) => join(REPOSITORY, "lib/emsenn/services/561-group/services", ...parts);
const RECORDS = under("561-group-services-section/services/561-group-operations-services-section/data/records/obligation-records");
const EDUCATION = under("public-services-section/services/public-social-services-section/services/public-education-services-section");
const WEB2 = under("engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/services/web-platform-services-section/services/web2-platform-services-section/services");
const OUTREACH_PKG = under("operations-services-section/services/enterprise-services-section/services/enterprise-network-services-section/services/enterprise-publication-services-section/services/enterprise-marketing-services-section/services/enterprise-outreach-services-section");
const CAMPAIGN = "ice-out-amazon-launch-2026-10-02";

const BUTTONDOWN_KEY = "bd_fixture_key_0123456789abcdef";
const FASTMAIL_TOKEN = "fmu1-fixturefixturefixture0123";

/** Fixture custody and services, and the page over them. Returns what a test needs and a restore. */
function house({ aliasHeld = { current: true } } = {}) {
  const root = mkdtempSync(join(tmpdir(), "declared-obligations-"));
  const home = join(root, "home");
  const env = {
    HOME: home, FASTMAIL_CREDENTIALS_DIR: join(home, ".config/561-group/fastmail"), YOUTUBE_CREDENTIALS: join(home, ".config/561-group/youtube.env"),
    METROPLAT_WEB_DATA_DIR: join(root, "web"), METROPLAT_REPOSITORY_ROOT: root, FELTOS_ENTERPRISE_HOST: join(HERE, "../package.json"),
  };
  const saved = { ...process.env, fetch: globalThis.fetch };
  Object.assign(process.env, env);

  // The education tree the live repository carries: one channel with no connection.
  const channel = join(root, relative(REPOSITORY, EDUCATION), "channels/pace-yourself");
  mkdirSync(channel, { recursive: true });
  writeFileSync(join(channel, "config.json"), JSON.stringify({ id: "pace-yourself", name: "PACE Yourself", handle: "@paceyourself", youtubeChannelId: "UC_pace", refreshTokenEnv: "YOUTUBE_REFRESH_TOKEN_PACE_YOURSELF" }));
  mkdirSync(dirname(env.YOUTUBE_CREDENTIALS), { recursive: true });
  writeFileSync(env.YOUTUBE_CREDENTIALS, "YOUTUBE_OAUTH_CLIENT_ID=client-id\nYOUTUBE_OAUTH_CLIENT_SECRET=client-secret\n");

  // The outreach campaign's records: two prospects wait on a judgment, one is ready.
  const campaign = join(root, "outreach", CAMPAIGN);
  mkdirSync(campaign, { recursive: true });
  writeFileSync(join(campaign, "status.json"), JSON.stringify({
    campaign: CAMPAIGN, at: "2026-10-02T18:16:13.622Z",
    prospects: [
      { id: "syllables-of-swathi", state: "judge", reasons: ["the policy page could not be read (CERT_HAS_EXPIRED); open it and judge it"] },
      { id: "cecys-book-blog", state: "judge", reasons: ["the policy page speaks of AI"] },
      { id: "duluth-reader", state: "ready", reasons: [] },
    ],
  }));

  // The records are the real ones; the outreach directory is the fixture's.
  const records = join(root, "records");
  mkdirSync(records);
  for (const name of readdirSync(RECORDS)) writeFileSync(join(records, name), readFileSync(join(RECORDS, name)));

  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push(href);
    const reply = (value) => new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
    if (href.includes("buttondown.com")) {
      const authorized = String(init.headers?.authorization ?? "").includes(BUTTONDOWN_KEY);
      return authorized ? reply({ results: [{ id: "n1", username: "sigridsong", name: "Sigrid Song" }] }) : new Response("{}", { status: 401 });
    }
    if (href.endsWith("/jmap/session")) return reply({ username: "house@561.group", primaryAccounts: { "urn:ietf:params:jmap:mail": "a1", "urn:ietf:params:jmap:submission": "a1" }, apiUrl: "https://jmap.test/api" });
    if (href === "https://jmap.test/api") {
      const [[method, , id]] = JSON.parse(init.body).methodCalls;
      if (method === "Identity/get") return reply({ methodResponses: [["Identity/get", { list: [] }, id]] });
      if (method === "Identity/set") {
        return reply({ methodResponses: [["Identity/set", aliasHeld.current ? { created: { identity: { id: "i1" } } } : { notCreated: { identity: { type: "forbiddenFrom" } } }, id]] });
      }
    }
    throw new Error(`the fixture serves no ${href}`);
  };

  const source = {
    module: resolve(HERE, "../src/declared-obligations.mjs"), export: "declaredObligations",
    configuration: {
      records,
      driverModules: [
        { module: join(EDUCATION, "src/obligations.mjs"), export: "googleConsentDriver" },
        { module: join(WEB2, "buttondown-services-section/src/obligation-driver.mjs"), export: "buttondownKeyDriver" },
        { module: join(WEB2, "fastmail-services-section/src/obligation-driver.mjs"), export: "fastmailTokenDriver" },
        { module: join(OUTREACH_PKG, "src/obligation-driver.mjs"), export: "outreachJudgmentsDriver", configuration: { outreach: join(root, "outreach") } },
      ],
    },
  };
  const app = obligationsApp({ stateDir: join(root, "state"), sources: [source], runAs: async () => ({ bearers: [] }), navigation: [{ href: "/metroplex", label: "City" }] });
  const principal = { provider: "bearer", subjectHash: "emsenn" };
  const resource = (id) => app.resources.find((candidate) => candidate.id === id);
  const get = async (path) => {
    const walk = path !== "/obligations";
    const ctx = { locals: { principal }, req: { method: "GET", headers: {} }, url: new URL(`https://h.test${path}`), params: walk ? { source: path.split("/")[2], id: decodeURIComponent(path.split("/")[3]) } : {} };
    return resource(walk ? "ops-obligations.walk" : "ops-obligations").handler(ctx);
  };
  const post = async (id, fields) => {
    const body = new URLSearchParams(fields).toString();
    const req = Object.assign(Readable.from([Buffer.from(body)]), { method: "POST", headers: { origin: "https://h.test", host: "h.test", "content-type": "application/x-www-form-urlencoded" } });
    return resource("ops-obligations.walk").handler({ locals: { principal }, req, url: new URL("https://h.test/"), params: { source: "declared", id } });
  };
  const text = (response) => String(response.body ?? JSON.stringify(response));
  const restore = () => { for (const key of Object.keys(env)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } globalThis.fetch = saved.fetch; };
  return { root, home, env, campaign, calls, get, post, text, restore, aliasHeld };
}

test("the page lists every declared obligation, and PACE Yourself still renders as a walk", async () => {
  const h = house();
  try {
    const list = h.text(await h.get("/obligations"));
    for (const title of ["Connect PACE Yourself to the house", "Make Sigrid Song&#39;s newsletter at Buttondown", "Let the house send mail from press@561.group", "Decide 2 outreach pitches for Ice Out"]) {
      assert.ok(list.includes(title), `the list shows "${title}"`);
    }
    assert.ok(!list.includes("Nothing waits on you"));
    assert.ok(list.includes("Unblocks: uploading and scheduling the channel&#39;s videos"));

    const walk = h.text(await h.get("/obligations/declared/youtube%3Apace-yourself"));
    assert.ok(walk.includes("Open Google to connect PACE Yourself"));
    assert.ok(walk.includes("accounts.google.com/o/oauth2/v2/auth"));
    assert.match(walk, /pick PACE Yourself \(@paceyourself\), not your own name/u);
    assert.match(walk, /address starting http:\/\/localhost:8765/u);

    // A connection the node holds is custody's truth: nothing waits on it.
    writeFileSync(h.env.YOUTUBE_CREDENTIALS, `${readFileSync(h.env.YOUTUBE_CREDENTIALS, "utf8")}YOUTUBE_REFRESH_TOKEN_PACE_YOURSELF=held\n`);
    assert.ok(!h.text(await h.get("/obligations")).includes("Connect PACE Yourself to the house"));
  } finally { h.restore(); }
});

test("completing the Buttondown obligation holds the key in custody, writes a receipt without it, and discharges", async () => {
  const h = house();
  try {
    const id = "buttondown-sigridsong-api-key";
    const walk = h.text(await h.get(`/obligations/declared/${id}`));
    assert.ok(walk.includes("sigrid.song@fastmail.com"));
    assert.match(walk, /type="password"/u);

    const refused = await h.post(id, { value: "not a key" });
    assert.equal(refused.status, 400);
    const keyFile = join(h.home, ".config/561-group/buttondown/sigridsong.api-key");
    assert.ok(!existsSync(keyFile), "a refused answer holds nothing");

    const done = await h.post(id, { value: BUTTONDOWN_KEY });
    assert.equal(done.status ?? 200, 200);
    assert.equal(readFileSync(keyFile, "utf8").trim(), BUTTONDOWN_KEY);
    assert.equal(statSync(keyFile).mode & 0o777, 0o600);
    const receipt = readFileSync(join(h.env.METROPLAT_WEB_DATA_DIR, "records/obligation-discharges", `${id}.json`), "utf8");
    assert.equal(JSON.parse(receipt).id, id);
    assert.ok(!receipt.includes(BUTTONDOWN_KEY) && !h.text(done).includes(BUTTONDOWN_KEY), "the key is in custody only");
    assert.ok(!h.text(await h.get("/obligations")).includes("Make Sigrid Song"), "discharged: it no longer waits");
  } finally { h.restore(); }
});

test("the Fastmail token is held only once the press alias will send, in the credential file outreach reads", async () => {
  const aliasHeld = { current: false };
  const h = house({ aliasHeld });
  try {
    const id = "fastmail-api-token-and-press-alias";
    const credentials = join(h.env.FASTMAIL_CREDENTIALS_DIR, "fastmail.json");
    const walk = h.text(await h.get(`/obligations/declared/${id}`));
    assert.ok(walk.includes("press@561.group") && walk.includes("API tokens"));
    const early = await h.post(id, { value: FASTMAIL_TOKEN });
    assert.equal(early.status, 400);
    assert.match(h.text(early), /will not send as press@561\.group yet/u);
    assert.ok(!existsSync(credentials), "no alias, nothing held");

    aliasHeld.current = true;
    const done = await h.post(id, { value: FASTMAIL_TOKEN });
    assert.equal(done.status ?? 200, 200);
    const held = JSON.parse(readFileSync(credentials, "utf8"));
    assert.equal(held.token, FASTMAIL_TOKEN);
    assert.equal(statSync(credentials).mode & 0o777, 0o600);
    assert.ok(!h.text(done).includes(FASTMAIL_TOKEN));
    assert.ok(existsSync(join(h.env.METROPLAT_WEB_DATA_DIR, "records/obligation-discharges", `${id}.json`)));
    assert.ok(!h.text(await h.get("/obligations")).includes("Let the house send mail"));
  } finally { h.restore(); }
});

test("the six outreach judgments are one obligation: a form of the routine's own choices, whose answers feed the plan", async () => {
  const h = house();
  try {
    const id = "ice-out-outreach-judgments";
    const form = h.text(await h.get(`/obligations/declared/${id}`));
    for (const prospect of ["syllables-of-swathi", "cecys-book-blog"]) assert.ok(form.includes(`name="${prospect}"`), `a choice for ${prospect}`);
    assert.ok(!form.includes('name="duluth-reader"'), "only what waits is asked");
    assert.match(form, /value="send"/u);
    assert.match(form, /value="skip"/u);

    const incomplete = await h.post(id, { "syllables-of-swathi": "send", "cecys-book-blog": "" });
    assert.equal(incomplete.status, 400);
    assert.ok(!existsSync(join(h.campaign, "decisions.json")));

    const done = await h.post(id, { "syllables-of-swathi": "send", "cecys-book-blog": "skip" });
    assert.equal(done.status ?? 200, 200);
    const decisions = JSON.parse(readFileSync(join(h.campaign, "decisions.json"), "utf8"));
    assert.deepEqual(Object.entries(decisions).map(([prospect, decision]) => [prospect, decision.verdict]), [["cecys-book-blog", "suppress"], ["syllables-of-swathi", "send"]]);
    assert.ok(!h.text(await h.get("/obligations")).includes("outreach pitches"), "answered: it no longer waits");

    // The routine's own state takes them: the next plan binds each decision to the concern then standing.
    const { openCampaignRecords } = await import(join(OUTREACH_PKG, "src/records.mjs"));
    const { planCampaign } = await import(join(OUTREACH_PKG, "src/outreach.mjs"));
    assert.deepEqual(Object.keys(await openCampaignRecords(h.campaign, CAMPAIGN, { env: h.env }).decisions()), ["cecys-book-blog", "syllables-of-swathi"]);
    {
      const records = openCampaignRecords(h.campaign, CAMPAIGN, { env: h.env });
      writeFileSync(join(h.campaign, "amendments.json"), JSON.stringify({ senders: { press: { from: "press@561.group", name: "Causeway Services", signature: "C", copyLine: "A review is never required." } } }));
      const prospect = { id: "cecys-book-blog", request: "r1", sender: { profile: "press" }, recipient: { name: "Cecy", email: "c@x.test" }, subject: "Ice Out", body: "Hello Cecy, here is a book.\n\nCauseway Services", policy: "https://cecy.test/policy", source: null };
      const page = async () => new Response("<p>We do not accept books written with AI. Everything else is fine.</p>", { status: 200 });
      const plan = await planCampaign({ campaign: { id: CAMPAIGN, prospects: [prospect], suppression: [] }, records, fetch: page, now: new Date("2026-10-03T00:00:00Z") });
      assert.equal(plan.rows[0].state, "declined", "the founder's skip binds to the concern and the prospect is not pitched");
      const judgments = await records.judgments();
      assert.equal(judgments["cecys-book-blog"].verdict, "suppress");
      assert.match(judgments["cecys-book-blog"].concern, /^[0-9a-f]{64}$/u);
    }
  } finally { h.restore(); }
});
