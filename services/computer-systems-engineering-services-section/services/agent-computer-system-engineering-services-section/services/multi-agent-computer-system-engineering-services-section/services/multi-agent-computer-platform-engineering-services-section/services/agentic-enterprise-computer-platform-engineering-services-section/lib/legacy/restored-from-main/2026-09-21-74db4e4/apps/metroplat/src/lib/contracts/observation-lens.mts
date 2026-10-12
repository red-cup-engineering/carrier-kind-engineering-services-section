export interface ObservationalLens {
  readonly id: string;
  readonly domain: string;
  readonly boundary: string;
  readonly preserves: readonly string[];
  readonly hides: readonly string[];
  readonly output: string;
  readonly evidenceRequired: boolean;
}

export function observationalLens(spec: ObservationalLens): ObservationalLens {
  return Object.freeze({
    ...spec,
    preserves: Object.freeze([...spec.preserves]),
    hides: Object.freeze([...spec.hides]),
  });
}
