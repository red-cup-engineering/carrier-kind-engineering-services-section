/** The subject of an authenticated principal or operation invocation.
 *  Reading an identity grants no authority and loads no agency or game state.
 *  Preserve the admission carrier's established provider/hash precedence. */
export function subjectOf(source, otherwise) {
  if (typeof source?.subjectHash === "string") return source.provider === "bearer" ? source.subjectHash : `${source.provider}:${source.subjectHash}`;
  return (source?.invocation ?? source)?.subject ?? otherwise;
}
