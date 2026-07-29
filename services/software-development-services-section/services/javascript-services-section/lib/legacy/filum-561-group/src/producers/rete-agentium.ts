// The rete-agentium wire's producer: the newsroom's claim sets, projected
// into claim-state bundles.
//
// The rete-agentium newsroom (services/newsroom, rete-agentium.swarm
// .561.group) keeps producing exactly as it does; this producer reads its
// published claim sets and asserts them onto the cable as bundles. That
// displaces services/newswire for this wire — the cable serves what the
// the cable serves what the wire serves, now at newscable.561.group/newswires/rete-agentium/.
// Modality is coarse here by necessity: the claim-set shapes carry no
// force, so potential claims arrive as "confirms" with the claimants as
// witnesses; finer modality lands when the newsroom itself writes bundles
// (the recorded subsumption).
//
// An unreachable newsroom is not an error: the wire simply has nothing new
// to assert this run.

import process from "node:process";
import { fileURLToPath } from "node:url";
import type { AssertedClaim, ClaimStateBundle, NewsClaim, NewsClaimSet } from "@emsenn/content/topology/news";
import { assertedNow, resolveDate, reportWrite, writeBundleIfAbsent } from "@emsenn/producing-content/organizing-a-newswire";

const CLAIM_SETS_URL =
  process.env.RETE_AGENTIUM_CLAIM_SETS ?? "http://127.0.0.1:18791/newsroom-claim-sets.json";

/** This wire's store: its own backstage/store/, absolute. */
const STORE = fileURLToPath(new URL("../../store/rete-agentium/", import.meta.url));

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "claim"
  );
}

function witnessNames(value: string | readonly string[] | undefined): readonly string[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

function projected(
  claim: NewsClaim,
  index: number,
  asserted: string,
  status: AssertedClaim["status"],
): AssertedClaim {
  const names = [...witnessNames(claim.claimedBy), ...witnessNames(claim.contraryClaimedBy)];
  const witness = names.length > 0 ? names.join(", ") : "rete-agentium newsroom";
  return Object.freeze({
    id: `${slug(claim.predicate)}-${index}`,
    proposition: Object.freeze({ predicate: claim.predicate, object: claim.object }),
    time: Object.freeze({ asserted }),
    force: "confirms" as const,
    provenance: Object.freeze({
      witness,
      method: "services/newsroom cycle (news claim set, projected)",
      ...(claim.citation === undefined ? {} : { citation: claim.citation }),
    }),
    status,
  });
}

async function main(): Promise<void> {
  resolveDate(process.argv.slice(2).find((argument) => argument !== "--")); // the wire is dateless; validate the arg if given
  const asserted = assertedNow();
  let claimSets: readonly NewsClaimSet[];
  try {
    const response = await fetch(CLAIM_SETS_URL, { headers: { accept: "application/json" } });
    if (!response.ok) throw new TypeError(`HTTP ${response.status}`);
    const payload = (await response.json()) as unknown;
    claimSets = Array.isArray(payload)
      ? (payload as readonly NewsClaimSet[])
      : (((payload as { claimSets?: readonly NewsClaimSet[] }).claimSets) ?? []);
  } catch (error) {
    console.log(`rete-agentium newsroom unreachable (${(error as Error).message}); nothing to assert`);
    return;
  }
  for (const claimSet of claimSets) {
    if (typeof claimSet?.subject !== "string" || claimSet.subject.length === 0) continue;
    const claims: AssertedClaim[] = [];
    let index = 0;
    for (const claim of claimSet.potential ?? []) claims.push(projected(claim, (index += 1), asserted, "supported"));
    for (const claim of claimSet.stable ?? []) claims.push(projected(claim, (index += 1), asserted, "contested"));
    for (const claim of claimSet.active ?? []) claims.push(projected(claim, (index += 1), asserted, "retracted"));
    if (claims.length === 0) continue;
    const bundle: ClaimStateBundle = Object.freeze({ subject: slug(claimSet.subject), claims: Object.freeze(claims) });
    const outcome = await writeBundleIfAbsent(STORE, bundle);
    reportWrite("rete-agentium", bundle.subject, outcome);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
