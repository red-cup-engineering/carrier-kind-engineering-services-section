/**
 * The capability reading of a settled valuation.
 *
 * This module deliberately has no knowledge of a transport, implementation
 * family, or operation spelling.  A capability is a valued claim.  Sources
 * outside the capability algebra witness those claims; this fold is the only place where
 * their callable standing is read.
 */

import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinReading, readingAs, sidesOfReading } from "@red-cup-engineering/computer-data-services-section/four";

/**
 * The content of one capability claim, addressed by its language term.
 *
 * @metroplatSubject capability
 */

/** One journal-admissible reading witness.  `carrier` stays outside the core. */

export const capabilityAddress = (claim) => artifactId(claim.address);

export function capabilityClaim(
  address,
  body,
  contract,
  codecs = [],
  reads = [],
  writes = [],
) {
  return Object.freeze({
    kind: "metroplat.capability.claim",
    address,
    body,
    contract,
    codecs: Object.freeze([...codecs]),
    reads: Object.freeze([...reads]),
    writes: Object.freeze([...writes]),
  });
}

export function capabilityWitness(
  claim,
  reading,
  carrier,
  causes = [],
) {
  return Object.freeze({
    kind: "metroplat.capability.witness",
    claim,
    reading,
    causes: Object.freeze([...causes]),
    carrier,
  });
}

function causalOrder(claims) {
  const addresses = new Map(claims.map((claim) => [capabilityAddress(claim), claim]));
  const writers = new Map();
  for (const claim of claims) {
    const address = capabilityAddress(claim);
    for (const written of claim.writes) {
      const key = canonicalJson(written);
      const at = writers.get(key) ?? [];
      at.push(address);
      writers.set(key, at);
    }
  }
  const prerequisites = new Map();
  for (const [address, claim] of addresses) {
    const required = new Set();
    for (const read of claim.reads) for (const writer of writers.get(canonicalJson(read)) ?? []) if (writer !== address) required.add(writer);
    prerequisites.set(address, required);
  }
  const remaining = new Map([...prerequisites.entries()].map(([key, value]) => [key, new Set(value)]));
  const order = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()].filter(([, needs]) => needs.size === 0).map(([address]) => address).sort();
    if (ready.length === 0) break;
    for (const address of ready) {
      order.push(address);
      remaining.delete(address);
      for (const needs of remaining.values()) needs.delete(address);
    }
  }
  return Object.freeze({ order: Object.freeze(order), cyclic: new Set(remaining.keys()) });
}

/** Fold claim-reading witnesses by the FOUR knowledge join and read dK/dTop. */
export function readCapabilityWitnesses(witnesses) {
  const byAddress = new Map();
  for (const witness of witnesses) {
    const address = capabilityAddress(witness.claim);
    const at = byAddress.get(address) ?? [];
    at.push(witness);
    byAddress.set(address, at);
  }
  const claims = [...byAddress.values()].map((entries) => entries[0].claim);
  const causality = causalOrder(claims);
  const valuation = {};
  for (const [address, entries] of [...byAddress.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    // Claims are witnessed in the claim-session (extremal) family; FOUR joins only names of
    // one family, so each witness is named in the knowledge family the valuation is read in.
    let reading = "absurd";
    for (const entry of entries) reading = knowledgeJoinReading(reading, readingAs("knowledge", entry.reading));
    valuation[address] = causality.cyclic.has(address) ? readingAs("knowledge", "contested") : reading;
  }
  // designated: told for; obstructions: told both, or on a causal cycle.
  const positive = new Set(Object.keys(valuation).filter((address) => sidesOfReading(valuation[address])[0]));
  const contested = new Set([...Object.keys(valuation).filter((address) => sidesOfReading(valuation[address]).every(Boolean)), ...causality.cyclic]);
  const designated = [...byAddress.entries()]
    .filter(([address]) => positive.has(address))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([address, entries]) => Object.freeze({
      address,
      claim: entries[0].claim,
      reading: valuation[address],
      carriers: Object.freeze(entries.map((entry) => entry.carrier)),
    }));
  const obstructions = [...contested].sort().map((address) => {
    const entries = byAddress.get(address) ?? [];
    return Object.freeze({
      kind: "metroplat.capability.obstruction",
      address,
      reading: valuation[address],
      price: entries.length + (causality.cyclic.has(address) ? 1 : 0),
      sources: Object.freeze(entries.map((entry) => capabilityAddress(entry.claim)).sort()),
    });
  });
  return Object.freeze({
    kind: "metroplat.capability.reading",
    valuation: Object.freeze(valuation),
    designated: Object.freeze(designated),
    obstructions: Object.freeze(obstructions),
    order: causality.order,
  });
}
