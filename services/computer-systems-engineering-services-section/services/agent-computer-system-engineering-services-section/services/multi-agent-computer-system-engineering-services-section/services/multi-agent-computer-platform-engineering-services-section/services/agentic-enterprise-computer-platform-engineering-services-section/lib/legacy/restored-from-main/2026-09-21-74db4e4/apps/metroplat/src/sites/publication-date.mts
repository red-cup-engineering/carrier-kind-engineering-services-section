import { chargeSide, chargeValueName, chargeValueAt, type ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export interface PublicationDateCandidate {
  readonly source: string;
  readonly value: string | undefined;
}

export interface PublicationDateReadout {
  readonly kind: "metroplat.web.publication-date.readout";
  readonly charge: ChargeValueName;
  readonly date?: string;
  readonly evidence: readonly string[];
}

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/u;

export function publicationDateReadout(candidates: readonly PublicationDateCandidate[]): PublicationDateReadout {
  const observed = candidates
    .map((candidate) => Object.freeze({ source: candidate.source, value: candidate.value?.trim() }))
    .filter((candidate): candidate is Readonly<{ source: string; value: string }> => candidate.value !== undefined && candidate.value !== "");
  if (observed.length === 0) return readout("unknown", undefined, ["publication-date:absent"]);

  const valid = observed.filter((candidate) => DATE_LIKE.test(candidate.value));
  const invalid = observed.filter((candidate) => !DATE_LIKE.test(candidate.value));
  const distinctValid = [...new Set(valid.map((candidate) => candidate.value))];

  if (valid.length === 0) {
    return readout("denied", undefined, invalid.map((candidate) => `${candidate.source}:invalid:${candidate.value}`));
  }
  if (invalid.length > 0 || distinctValid.length > 1) {
    return readout("contested", undefined, [
      ...valid.map((candidate) => `${candidate.source}:date:${candidate.value}`),
      ...invalid.map((candidate) => `${candidate.source}:invalid:${candidate.value}`),
    ]);
  }
  return readout("held", distinctValid[0], valid.map((candidate) => `${candidate.source}:date:${candidate.value}`));
}

function readout(charge: ChargeValueName, date: string | undefined, evidence: readonly string[]): PublicationDateReadout {
  const coordinates = chargeValueAt([
    chargeSide(charge === "potential" || charge === "stable" ? "present" : "absent"),
    chargeSide(charge === "active" || charge === "stable" ? "present" : "absent"),
  ]);
  return Object.freeze({
    kind: "metroplat.web.publication-date.readout" as const,
    charge: chargeValueName(coordinates),
    ...(date === undefined ? {} : { date }),
    evidence: Object.freeze([...evidence]),
  });
}
