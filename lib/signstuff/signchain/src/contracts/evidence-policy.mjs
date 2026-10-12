

export function evidencePolicy(spec) {
  return Object.freeze({ ...spec, records: Object.freeze([...spec.records]) });
}
