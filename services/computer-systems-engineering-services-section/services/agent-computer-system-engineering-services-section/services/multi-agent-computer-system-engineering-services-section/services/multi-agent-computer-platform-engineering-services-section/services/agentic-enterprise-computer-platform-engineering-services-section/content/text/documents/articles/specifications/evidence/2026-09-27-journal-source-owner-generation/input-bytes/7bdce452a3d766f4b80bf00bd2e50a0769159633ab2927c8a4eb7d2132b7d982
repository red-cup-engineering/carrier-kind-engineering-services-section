/** Resolve an RFC 6901 fragment against one JSON document. */
export function resolveJsonPointer(document, fragment) {
  if (fragment === "" || fragment === "#") return document;
  let pointer = fragment;
  if (fragment.startsWith("#")) {
    try {
      pointer = decodeURIComponent(fragment.slice(1));
    } catch {
      return undefined;
    }
  }
  if (!pointer.startsWith("/")) return undefined;
  let current = document;
  for (const rawPart of pointer.slice(1).split("/")) {
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    current = Array.isArray(current) ? current[Number(part)] : (current)[part];
  }
  return current;
}
