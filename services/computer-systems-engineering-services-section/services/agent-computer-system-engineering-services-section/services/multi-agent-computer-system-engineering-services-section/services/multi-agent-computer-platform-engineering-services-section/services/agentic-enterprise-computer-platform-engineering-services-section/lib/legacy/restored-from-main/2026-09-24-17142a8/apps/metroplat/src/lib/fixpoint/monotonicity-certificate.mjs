/**
 * settling/monotonicity-certificate — coordination cost from cover cohomology.
 *
 * A federated statement names a source, a logical cell, and the stance that source
 * contributes for that cell. For each logical cell we build the cover nerve as the
 * bipartite graph `source -- stance`, compute H¹ with the existing predication
 * cohomology reader, and expose exactly the nonzero H¹ cells as coordination
 * obstructions. No protocol operation names participate in this certificate.
 */

export const federatedCoverStatementSchema = {
  $id: "metroplat/closure/federated-cover-statement",
  title: "FederatedCoverStatement",
  description: "One source contribution to a logical cell in a federated cover; stance is the local section value.",
  type: "object",
  additionalProperties: false,
  required: ["source", "cell", "stance"],
  properties: {
    source: { type: "string", minLength: 1 },
    cell: { type: "string", minLength: 1 },
    stance: { type: "string", minLength: 1 },
    witness: { type: "string", minLength: 1 },
  },
};
