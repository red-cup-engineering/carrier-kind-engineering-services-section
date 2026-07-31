import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryRwilDocumentsByCategory } from "@lenticule-science/witness-journal-rdf-projection-service/client";

export const GIT_ACTIVITY_PROVIDER = "urn:ame:git-services-section:activity-pulse-provider";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COLONY_ACTOR = "urn:ame:bare-cedar-fog-colony";
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
export async function collectGitColonyActivity({ window, recordedAt, dataRoot = join(ROOT, "data") } = {}) {
  const from = Date.parse(window.fromExclusive); const to = Date.parse(window.toInclusive); const witnesses = []; const rows = [];
  for (const document of await queryRwilDocumentsByCategory(dataRoot)) {
    const row = document.value;
    if (row?.type !== "GitOperationWitness") continue;
    const at = Date.parse(row.recordedAt);
    if (!Number.isFinite(at) || at <= from || at > to) continue;
    witnesses.push(document.id); rows.push(row);
  }
  rows.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.subject.localeCompare(right.subject));
  const count = (kind) => rows.filter((row) => row.kind === kind).length;
  const completed = count("completion"); const refused = count("refusal");
  const events = rows.length ? [{ id: `urn:sha256:${digest(`${window.fromExclusive}\n${window.toInclusive}\n${witnesses.join("\n")}`)}`, occurredAt: rows.at(-1).recordedAt, domain: "git-io", kind: "git-boundary-interval",
    summary: `${rows.length} Git boundary records: ${count("ingress")} solicitations, ${count("offer")} offers, ${completed} completions, and ${refused} refusals.`, outcome: refused ? "refused" : completed ? "succeeded" : "observed",
    quantities: [
      { label: "Git boundary records", amount: String(rows.length), unit: "records", displayOrder: 300 },
      { label: "Git operations completed", amount: String(completed), unit: "operations", displayOrder: 301 },
      { label: "Git operations refused", amount: String(refused), unit: "operations", displayOrder: 302 }
    ], evidence: witnesses.length ? witnesses : ["urn:ame:git-services-section:evidence:no-journal-in-window"] }] : [];
  return { type: "ColonyActivityPulseEnvelope", providerActor: GIT_ACTIVITY_PROVIDER, settlementActor: "urn:ame:git-services-section", colonyActor: COLONY_ACTOR, window, recordedAt, events, stocks: [],
    unsupportedDomains: ["formations", "contracts", "work", "a2a", "activity-streams", "evm", "economy", "deployments", "operations"],
    refusals: [{ domain: "activity-streams", reason: "Only typed GitOperationWitness objects carrying exact event instants are promoted into this interval; displaced carriers and older un-timed witnesses are excluded.", evidence: witnesses }] };
}
