/**
 * flickering.561.group — the thin transport over the DelveScene.
 *
 * Everything load-bearing lives in the pure modules and the scene; this file is only the
 * binding the doctrine asks for: it inherits identity/SSE/queue from the upstream session
 * carrier (the same transport FizzOS's own mud-server uses), runs the sole-writer tick loop,
 * mounts the browser client and the payment/audit routes, and persists via FizzOS's
 * event-sourced checkpointer. No game logic is implemented here.
 *
 * Env: PORT/FLICKERING_PORT, HOST, FLICKERING_SAVE (world snapshot), FLICKERING_LEDGER (audit
 * journal), STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, HIVE_ACCOUNT, HIVE_NODES.
 */
import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type App, type Context, type Repr, htmlRepr, installGracefulShutdown, jsonRepr, mergeApps,
  readJsonBody, readTextBody, start,
} from "@red-cup-engineering/http-server";
import { createQueuedWebSessionCarrier } from "@red-cup-engineering/organizing-with-the-web/session-carrier";
import { throttleIntents } from "@red-cup-engineering/fizzos/mud-server";
import { checkpoint, fileStore } from "@red-cup-engineering/fizzos/persistence";
import { DelveScene, type DelveSnapshot, TICK_SECONDS } from "./scene.mts";
import { type DungeonConfig, DEFAULT_DUNGEON } from "./dungeon.mts";
import { type LedgerEntry, AuditLedger } from "./ledger.mts";
import { Payments, SKUS } from "./payments.mts";
import { Accounts, AuthError, guestActorId, isGuest } from "./accounts.mts";
import { CLIENT_HTML } from "./client.mts";

/** A queued command intent — an actor and the line they sent. */
interface Intent { readonly actor: string; readonly line: string; }

const DEFAULT_PORT = 18_795;
const FLOOD_CAP = 8;

function port(): number {
  const raw = process.env["FLICKERING_PORT"] ?? process.env["PORT"];
  if (raw === undefined) return DEFAULT_PORT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0 || n > 65_535) throw new Error(`bad port ${raw}`);
  return n;
}

function loadConfig(): DungeonConfig {
  try {
    const raw = readFileSync(fileURLToPath(new URL("../world/dungeon.json", import.meta.url)), "utf8");
    return { ...DEFAULT_DUNGEON, ...(JSON.parse(raw) as Partial<DungeonConfig>) };
  } catch {
    return DEFAULT_DUNGEON;
  }
}

const host = process.env["HOST"] ?? "127.0.0.1";
const savePath = process.env["FLICKERING_SAVE"];
const ledgerPath = process.env["FLICKERING_LEDGER"];

// ── state: scene, ledger, payments, accounts ──────────────────────────────────────
const sceneStore = savePath === undefined ? undefined : fileStore<DelveSnapshot>(savePath);
const restored = sceneStore?.load() ?? undefined;
const scene = new DelveScene(loadConfig(), restored ?? undefined);

const ledgerStore = ledgerPath === undefined ? undefined : fileStore<LedgerEntry[]>(ledgerPath);
const ledger = new AuditLedger(ledgerStore?.load() ?? []);

const payments = new Payments(ledger, {
  stripeSecretKey: process.env["STRIPE_SECRET_KEY"],
  stripeWebhookSecret: process.env["STRIPE_WEBHOOK_SECRET"],
  hiveAccount: process.env["HIVE_ACCOUNT"],
  hiveNodes: process.env["HIVE_NODES"]?.split(",").map((s) => s.trim()).filter(Boolean),
});
const accounts = new Accounts(scene);

// ── transport: the session carrier (identity, SSE, input queue) ─────────────────────
const carrier = createQueuedWebSessionCarrier<Intent>({
  login: ({ name, secret }) => ({ session: accounts.authenticate({ name, secret, guest: name.startsWith("guest-") }) }),
  validateInput: (input) => (typeof input.line === "string" && input.line.trim() !== "" ? { actor: input.session, line: input.line } : null),
  streamSeed: (session) => {
    const events = scene.join(session);
    return { out: events.map((e) => e.text), state: scene.stateFrame(session) };
  },
  snapshot: (session) => scene.stateFrame(session),
});

// ── the sole-writer tick loop ───────────────────────────────────────────────────────
let tickN = 0;
function step(): void {
  const drained = carrier.drainInput();
  const { kept } = throttleIntents(drained.map((i) => ({ k: "command", actor: i.actor, line: i.line })), FLOOD_CAP);
  const events = scene.runTick(kept.map((i) => ({ actor: i.actor, line: i.line })));
  tickN++;
  const byActor = new Map<string, string[]>();
  for (const e of events) {
    const lines = byActor.get(e.to) ?? [];
    lines.push(e.text);
    byActor.set(e.to, lines);
  }
  for (const actor of scene.activePlayers()) {
    const lines = byActor.get(actor);
    if (lines !== undefined && lines.length > 0) void carrier.emitOutput(actor, lines, { refreshState: false });
    void carrier.emitState(actor, scene.stateFrame(actor));
  }
}

// ── routes (thin: client, store, payments, audit, health) ───────────────────────────
const bearer = (ctx: Context): string => (ctx.req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
const actorOf = (ctx: Context): string | undefined => carrier.sessionOf(bearer(ctx));

const gameApp: App = {
  security: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
    frameOptions: "DENY",
    contentTypeOptions: "nosniff",
  },
  resources: [
    { match: (p) => p === "/" || p === "/index.html", methods: ["GET"], produces: ["text/html"],
      handler: async (): Promise<Repr> => htmlRepr(CLIENT_HTML) },

    { match: "/health", methods: ["GET"], produces: ["application/json"],
      handler: async (): Promise<Repr> => jsonRepr({ status: "ok", tick: tickN, ...scene.metrics() }) },

    { match: "/store", methods: ["GET"], produces: ["application/json"],
      handler: async (): Promise<Repr> => jsonRepr({ skus: SKUS, providers: payments.available() }) },

    // Transparency: anyone may replay the audit journal and check the books balance.
    { match: "/audit", methods: ["GET"], produces: ["application/json"],
      handler: async (): Promise<Repr> => jsonRepr(ledger.audit()) },

    { match: "/pay/intent", methods: ["POST"], produces: ["application/json"],
      handler: async (ctx): Promise<Repr> => {
        const actor = actorOf(ctx);
        if (actor === undefined) return jsonRepr({ error: "not logged in" }, { status: 401 });
        const body = (await readJsonBody(ctx.req)) as { sku?: string; provider?: string };
        if (typeof body.sku !== "string") return jsonRepr({ error: "missing sku" }, { status: 400 });
        try {
          return jsonRepr(await payments.intent(actor, body.sku, body.provider));
        } catch (err) {
          return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
        }
      } },

    { match: "/pay/settle", methods: ["POST"], produces: ["application/json"],
      handler: async (ctx): Promise<Repr> => {
        const actor = actorOf(ctx);
        if (actor === undefined) return jsonRepr({ error: "not logged in" }, { status: 401 });
        const body = (await readJsonBody(ctx.req)) as { orderId?: string };
        if (typeof body.orderId !== "string") return jsonRepr({ error: "missing orderId" }, { status: 400 });
        const grant = await payments.settle(body.orderId);
        if (grant !== null) scene.grantBoost(grant.actor, grant.kind, grant.value, grant.durationSeconds);
        return jsonRepr({ cleared: grant !== null });
      } },

    // Stripe calls this; always answer 200 so it does not retry on our logic.
    { match: "/pay/stripe/webhook", methods: ["POST"], produces: ["application/json"],
      handler: async (ctx): Promise<Repr> => {
        const payload = await readTextBody(ctx.req);
        const sig = String(ctx.req.headers["stripe-signature"] ?? "");
        const grant = await payments.settleStripeWebhook(payload, sig);
        if (grant !== null) scene.grantBoost(grant.actor, grant.kind, grant.value, grant.durationSeconds);
        return jsonRepr({ received: true });
      } },

    // Claim a guest's progress into the logged-in account (federation migration).
    { match: "/claim", methods: ["POST"], produces: ["application/json"],
      handler: async (ctx): Promise<Repr> => {
        const actor = actorOf(ctx);
        if (actor === undefined || isGuest(actor)) return jsonRepr({ error: "log into an account first" }, { status: 401 });
        const body = (await readJsonBody(ctx.req)) as { guestKey?: string };
        if (typeof body.guestKey !== "string") return jsonRepr({ error: "missing guestKey" }, { status: 400 });
        const migrated = accounts.migrateGuest(guestActorId(body.guestKey), actor);
        return jsonRepr({ migrated, state: scene.stateFrame(actor) });
      } },
  ],
};

const app = mergeApps(gameApp, carrier.app);

// ── persistence: checkpoint scene + ledger ──────────────────────────────────────────
const checkpointers: { flush(): void }[] = [];
if (sceneStore !== undefined) checkpointers.push(checkpoint<DelveSnapshot>(() => scene.snapshot(), sceneStore, 30_000));
if (ledgerStore !== undefined) checkpointers.push(checkpoint<LedgerEntry[]>(() => [...ledger.all()], ledgerStore, 30_000));
process.on("exit", () => { for (const c of checkpointers) c.flush(); });

// Surface auth failures as 401 instead of crashing the login handler.
process.on("unhandledRejection", (reason) => {
  if (reason instanceof AuthError) return; // carrier turns the thrown login into an error response
  process.stderr.write(`unhandledRejection: ${String(reason)}\n`);
});

const result = await start(app, { host, port: port() });
installGracefulShutdown(result, {});
const timer = setInterval(step, Math.round(TICK_SECONDS * 1000));
timer.unref?.();
const shown = host === "0.0.0.0" ? "127.0.0.1" : host;
process.stdout.write(`flickering: the Gnaw is open on http://${shown}:${port()}/  (tick ${Math.round(TICK_SECONDS * 1000)}ms${savePath ? `, saving to ${savePath}` : ""})\n`);
