export interface EvidencePolicy {
  readonly id: string;
  readonly required: boolean;
  readonly records: readonly string[];
  readonly time: "none" | "instant" | "stage" | "interval";
  readonly caller: "none" | "optional" | "required";
  readonly boundaryObject: "none" | "fingerprint" | "full";
}

export function evidencePolicy(spec: EvidencePolicy): EvidencePolicy {
  return Object.freeze({ ...spec, records: Object.freeze([...spec.records]) });
}
