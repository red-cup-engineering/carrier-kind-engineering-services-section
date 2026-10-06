/** Protocol-neutral description of an immutable RPC catalog. */

export function describe(
  catalog,
  standing = new Map(),
) {
  return Object.freeze({
    kind: "metroplat.rpc.description",
    operations: Object.freeze(catalog.operations.map((operation) => Object.freeze({
      kind: "metroplat.rpc.operation-description",
      ref: operation.ref,
      verb: operation.verb,
      inputFormat: operation.inputFormat,
      outputFormat: operation.outputFormat,
      options: operation.options,
      ...(operation.domain === undefined ? {} : { domain: operation.domain.id }),
      ...(operation.domain === undefined ? {} : { inputSchema: operation.domain.schema }),
      ...(operation.codomain === undefined ? {} : { codomain: operation.codomain.id }),
      ...(operation.relation === undefined ? {} : { relation: operation.relation }),
      body: operation.runTerm === undefined
        ? Object.freeze({ kind: "host", declaration: operation.verb })
        : Object.freeze({ kind: "sen", term: operation.runTerm }),
      effects: operation.effects,
      standing: standing.get(operation.ref) ?? "unknown",
      ...(operation.summary === undefined ? {} : { summary: operation.summary }),
      ...(operation.description === undefined ? {} : { description: operation.description }),
    }))),
  });
}
