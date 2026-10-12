/** Admit a non-blank string while preserving the caller's field-specific label. */
export function assertNonemptyString(value: string, label: string, expectation = "a non-empty string"): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected ${expectation}`);
  return value;
}
