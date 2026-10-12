/** Stable key segment used inside projection contract ids and artifact addresses. */
export function projectionSegmentKey(value, fallback) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}
