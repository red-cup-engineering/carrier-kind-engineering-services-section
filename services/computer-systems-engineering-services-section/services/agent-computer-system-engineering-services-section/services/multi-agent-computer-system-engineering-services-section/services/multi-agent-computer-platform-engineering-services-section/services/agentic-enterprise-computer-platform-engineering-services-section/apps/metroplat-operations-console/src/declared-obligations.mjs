/**
 * Declared obligations: what the house needs a person's own hands for, as DATA. Each obligation is a
 * record in a records directory (one JSON file each), and the page at /obligations lists the records
 * that still wait. A record says:
 *
 * ```
 * { "type": "Obligation", "version": 1,
 *   "id": "…",                  stable name; also the discharge receipt's name
 *   "kind": "…",                which driver walks it (a kind a driver is registered for)
 *   "to": ["emsenn"],           the characters it waits on (the account that bears one sees it)
 *   "title", "why",             what the person reads on the list
 *   "move": { "steps": [..], "link": { "href", "label" }, "input": { .. } },
 *                               the one move: steps, an optional link, and the input that carries the result
 *   "result": { .. },           where the result goes, as the kind's parameters (a newsletter, a campaign, …)
 *   "unblocks": [..],           what this unblocks
 *   "done": { "title", "content" } }
 * ```
 *
 * Text in a record may carry `{name}` marks; a driver that expands one record into many (one per
 * channel, say) supplies the values. A driver is `{ kind, instances(record), held(record, instance),
 * prepare(record, instance), capture(record, instance, memo, answer) }`:
 * - `instances` lists `{ id, vars }` for each occasion of the record (default: the record itself);
 * - `held`, when the driver has it, says whether the result is already in custody (then nothing waits);
 * - `prepare` returns `{ memo?, vars?, link?, input? }` extra to the walk (a link given here, an address say, completes the record's link);
 * - `capture` puts the answer into custody (never in a record, never in chat, never in the page) and
 *   returns `{ custody }`, a description of where it landed. It throws a refusal the person can act on.
 *
 * Completing an obligation writes a discharge receipt (`<discharges>/<id>.json`: when, where it landed;
 * never the value). Where a driver can read custody (`held`), custody is the truth and a receipt is only
 * the memory (a revoked token waits again); a driver without `held` is discharged by its receipt.
 *
 * This is an obligation source (see obligations.mjs): `declaredObligations(configuration)` returns
 * `{ id, title, obligations(), start(id), finish(id, memo, value, fields) }`. Drivers come from
 * `configuration.drivers`, `[{ module, export, configuration }]`, resolved from the enterprise host like
 * sources are, or are passed in as objects (`options.drivers`).
 * @module
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

const fill = (text, vars) => (typeof text === "string" ? text.replace(/\{(\w+)\}/gu, (whole, key) => (vars[key] === undefined ? whole : String(vars[key]))) : text);
const fillAll = (value, vars) => {
  if (typeof value === "string") return fill(value, vars);
  if (Array.isArray(value)) return value.map((item) => fillAll(item, vars));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillAll(item, vars)]));
  return value;
};

/** Every record in `dir`, in file order; a file that is not an Obligation record is refused loudly. */
export function readObligationRecords(dir) {
  if (!existsSync(dir)) throw Object.assign(new Error("The configured obligation records are unavailable; absence is not an empty obligation list."), { code: "OBLIGATION_RECORDS_UNAVAILABLE" });
  return readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => {
    const record = JSON.parse(readFileSync(join(dir, name), "utf8"));
    if (record?.type !== "Obligation" || typeof record.id !== "string" || typeof record.kind !== "string" || !Array.isArray(record.to) || record.to.length === 0) {
      throw new TypeError(`${name} is not an Obligation record (needs type, id, kind, to)`);
    }
    return record;
  });
}

const DEFAULT_DRIVER = (kind) => ({
  kind,
  instances: (record) => [{ id: record.id, vars: {} }],
  prepare: () => ({}),
});

async function loadDrivers(declared, repositoryRoot) {
  const require = createRequire(process.env.FELTOS_ENTERPRISE_HOST ?? import.meta.url);
  return Promise.all(declared.map(async (entry) => {
    const imported = await import(pathToFileURL(require.resolve(entry.module)).href);
    if (typeof imported[entry.export] !== "function") throw new TypeError(`${entry.module} does not export ${entry.export}`);
    return imported[entry.export]({ ...(entry.configuration ?? {}), repositoryRoot });
  }));
}

/**
 * @param {{ repositoryRoot?: string, records: string, drivers?: object[],
 *   driverModules?: {module: string, export: string, configuration?: object}[], discharges?: string,
 *   env?: NodeJS.ProcessEnv, now?: () => Date }} options
 *   `records` is the records directory, relative to `repositoryRoot` unless absolute.
 */
export function declaredObligations({ repositoryRoot = process.cwd(), records, drivers = [], driverModules = [], discharges, env = process.env, now = () => new Date() }) {
  if (typeof records !== "string" || records === "") throw new TypeError("declared obligations need the records directory");
  const recordsDir = isAbsolute(records) ? records : join(repositoryRoot, records);
  const dischargeDir = discharges ?? (env.METROPLAT_WEB_DATA_DIR ? join(env.METROPLAT_WEB_DATA_DIR, "records", "obligation-discharges") : join(recordsDir, "..", "obligation-discharges"));
  let loaded;
  const driverFor = async (kind) => {
    loaded ??= [...drivers, ...(await loadDrivers(driverModules, repositoryRoot))];
    return loaded.find((driver) => driver.kind === kind) ?? DEFAULT_DRIVER(kind);
  };
  const receiptPath = (id) => join(dischargeDir, `${id.replace(/[^\w.:-]/gu, "_")}.json`);
  const discharged = (id) => existsSync(receiptPath(id));

  /** Every occasion of every record that still waits, with the record and its driver. */
  const waiting = async () => {
    const owed = [];
    for (const record of readObligationRecords(recordsDir)) {
      const driver = await driverFor(record.kind);
      for (const instance of await driver.instances(record)) {
        // Custody is the truth where a driver can read it (a revoked token waits again); the receipt is the memory where it cannot.
        if (driver.held ? await driver.held(record, instance) : discharged(instance.id)) continue;
        owed.push({ record, driver, instance });
      }
    }
    return owed;
  };
  const find = async (id) => {
    const found = (await waiting()).find(({ instance }) => instance.id === id);
    if (!found) throw new Error("This was already done, or no longer waits. Go back to the list.");
    return found;
  };

  return {
    id: "declared",
    title: "Declared obligations",
    async obligations() {
      return (await waiting()).map(({ record, instance }) => ({
        id: instance.id, to: record.to,
        title: fill(record.title, instance.vars),
        why: [fill(record.why, instance.vars), record.unblocks?.length ? `Unblocks: ${record.unblocks.map((item) => fill(item, instance.vars)).join("; ")}.` : ""].filter(Boolean).join(" "),
      }));
    },
    async start(id) {
      const { record, driver, instance } = await find(id);
      const prepared = (await driver.prepare(record, instance)) ?? {};
      const vars = { ...instance.vars, ...(prepared.vars ?? {}) };
      const move = fillAll(record.move ?? {}, vars);
      return {
        memo: { ...(prepared.memo ?? {}), instance: instance.id },
        steps: move.steps ?? [],
        ...((prepared.link ?? move.link) ? { link: { ...(move.link ?? {}), ...(prepared.link ?? {}) } } : {}),
        input: { ...(move.input ?? { label: "your answer" }), ...(prepared.input ?? {}) },
      };
    },
    async finish(id, memo, value, fields = {}) {
      const { record, driver, instance } = await find(id);
      const answer = fields && Object.keys(fields).some((name) => name !== "value") ? fields : String(value ?? "");
      const landed = (await driver.capture(record, instance, memo ?? {}, answer)) ?? {};
      mkdirSync(dischargeDir, { recursive: true });
      const temp = `${receiptPath(id)}.${process.pid}.tmp`;
      writeFileSync(temp, `${JSON.stringify({ type: "ObligationDischarge", version: 1, id, record: record.id, kind: record.kind, at: now().toISOString(), landed: landed.custody ?? null, unblocks: record.unblocks ?? [] }, null, 2)}\n`);
      renameSync(temp, receiptPath(id));
      const done = fillAll(record.done ?? { title: "Done", content: "That is recorded." }, { ...instance.vars, ...(landed.vars ?? {}) });
      return done;
    },
  };
}

