import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { causalOrder, firingEvent, orderingFraction } from "@red-cup-engineering/signcraft/settle";
/**
 * communicate/cohesion — discourse COHESION of an agent membrane, read through the substrate
 * spectral graph Laplacian.
 *
 * communicating's across/truth face reads the membrane's per-subject lean (face.mts). This sibling
 * reading reads the membrane's DISCOURSE GRAPH — the subject↔object terms its utterances relate — as
 * relating's combinatorial graph Laplacian L = D − W (`@red-cup-engineering/relating` analysis.laplacian, exact over
 * ℤ). Two readings the face's per-cell census cannot give:
 *   • topics  = the connected-component count (H⁰, the Laplacian zero-eigenvalue multiplicity): how
 *     many INDEPENDENT discourse clusters the membrane splits into — subject-clusters that share no
 *     entity, hence cannot be about the same thing. One topic ⟺ the discourse is about one connected
 *     web of subjects.
 *   • cohesionTrees = the Matrix-Tree (Kirchhoff) spanning-tree count: the discourse's COHESION
 *     ROBUSTNESS — `0` the discourse fragments into several topics, `1` a single fragile thread (a
 *     spanning tree; one dropped utterance can fragment it), `> 1` a richly cross-linked discourse
 *     (redundant connections, resilient to dropped utterances).
 * The relation graph reads only the cells (subject↔object), so the membrane's pooled memes present it
 * directly via `membraneMeme` ∘ `relationGraphOfCells`. Total over any membrane. A LEAF over relating +
 * the package's own meme surface (does NOT import @red-cup-engineering/animating).
 */
import { utteranceCarrier } from "@red-cup-engineering/relating";
import { cohomologyReceiptOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { receipt } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/chromatic-lorentzian";
import { cell } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/transfinite-cell-complex";
import { magnitude, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { relationGraphOfCells } from "@red-cup-engineering/signgraph/cell-graph";
import { componentCount, treeCount, hodgeDecomposition } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { mutualInformation } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/information";
import { jsonResource } from "@red-cup-engineering/json-services-section";

import { membraneMeme } from "./face.mjs";

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */

export const membraneSchema = {
  $id: "communicating/membrane",
  title: "CommunicatingMembrane",
  description: "A communicating membrane admitted as an array of utterance carriers or { membrane: [...] }.",
  anyOf: [
    { type: "array", items: { $ref: utteranceCarrier.id } },
    {
      type: "object",
      required: ["membrane"],
      additionalProperties: true,
      properties: {
        membrane: { type: "array", items: { $ref: utteranceCarrier.id } },
      },
    },
  ],
};
export const membraneCarrier = schemaFrom(membraneSchema);

function discourseCohomologyReceipt(subjects, topics, cells) {
  const receipt = cohomologyReceiptOfCells(cells);
  return Object.freeze({
    kind: "communicating.discourse-cohesion.cohomology",
    subjects,
    topics,
    cells: cells.length,
    h0: receipt.h0,
    h1: receipt.h1,
    vanishing: receipt.vanishing,
    laplacian: receipt.laplacian,
  });
}

/** communicating's spectral read of discourse cohesion: H⁰ topics (component count) plus the
 *  Matrix-Tree spanning-tree count as the discourse's cohesion robustness. */

  

  

  

  

    

         

export const discourseCohesionSchema = {
  $id: "communicating/discourse-cohesion",
  title: "DiscourseCohesion",
  type: "object",
  required: ["kind", "subjects", "topics", "connected", "cohesionTrees", "cohesive", "redundant", "derivable", "irreducible", "cohomology"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-cohesion" },
    subjects: { type: "integer", minimum: 0 },
    topics: { type: "integer", minimum: 0 },
    connected: { type: "boolean" },
    cohesionTrees: { type: "integer", minimum: 0 },
    cohesive: { type: "boolean" },
    redundant: { type: "boolean" },
    derivable: { type: "integer", minimum: 0 },
    irreducible: { type: "integer", minimum: 0 },
    cohomology: { type: "object" },
  },
};
export const discourseCohesionCarrier = schemaFrom(discourseCohesionSchema);

/** The empty/edgeless discourse (no related cells present a graph). */
const emptyDiscourseCohesion = (subjects) => Object.freeze({
  kind: "communicating.discourse-cohesion",
  subjects,
  topics: subjects,
  connected: subjects === 1,
  cohesionTrees: subjects <= 1 ? 1 : 0,
  cohesive: subjects <= 1,
  redundant: false,
  derivable: 0,
  irreducible: 0,
  cohomology: discourseCohomologyReceipt(subjects, subjects, []),
});

/** Read a membrane's discourse cohesion through the substrate graph Laplacian: the topic count (H⁰)
 *  and the spanning-tree robustness of the discourse. */
export function discourseCohesionOf(membrane) {
  const cells = membrane.map((carrier) => membraneMeme(carrier));
  const related = cells.filter((cell) => cell.subject !== cell.object);
  if (related.length === 0) {
    const terms = [];
    for (const cell of cells) for (const term of [cell.subject, cell.object]) if (!terms.includes(term)) terms.push(term);
    return emptyDiscourseCohesion(terms.length);
  }
  const graph = relationGraphOfCells(cells);
  const topics = toCount(componentCount(graph));
  const cohesionTrees = toCount(magnitude(treeCount(graph)));
  const hodge = hodgeDecomposition(graph);
  const cohomology = discourseCohomologyReceipt(graph.terms.length, topics, related);
  return Object.freeze({
    kind: "communicating.discourse-cohesion",
    subjects: graph.terms.length,
    topics,
    connected: topics === 1,
    cohesionTrees,
    cohesive: cohesionTrees === 1,
    redundant: cohesionTrees > 1,
    derivable: toCount(hodge.exact),
    irreducible: toCount(hodge.harmonic),
    cohomology,
  });
}

const admitMembrane = (input) => {
  if (Array.isArray(input)) return input;
  if (input !== null && typeof input === "object" && Array.isArray((input).membrane)) {
    return (input).membrane;
  }
  throw new TypeError("cohere: expected a membrane (an array of utterance carriers) or { membrane: [...] }");
};

/** cohere — read a membrane's discourse cohesion through the spectral graph Laplacian (H⁰ topics +
 *  Matrix-Tree spanning-tree robustness). */
export const cohereAction = operation({
  verb: "cohere",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane's DISCOURSE COHESION through the substrate graph Laplacian: H⁰ topics (component count) and the Matrix-Tree spanning-tree count as cohesion robustness.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/discourse-cohesion — the membrane's discourse graph (subject↔object terms) read through relating's combinatorial graph Laplacian L = D − W (analysis.laplacian, exact over ℤ). `topics` is the connected-component count H⁰ (independent discourse clusters sharing no entity); `cohesionTrees` is the Matrix-Tree spanning-tree count — the discourse's cohesion ROBUSTNESS: 0 fragmented, 1 a single fragile thread, > 1 a richly cross-linked resilient discourse. Grounded in relating's analysis.laplacian (relationGraphOfCells / componentCount / treeCount) and the across-face membrane reading (face.mts).",
  domain: membraneCarrier,
  codomain: discourseCohesionCarrier,
  run: (input) =>
    jsonResource(discourseCohesionOf(admitMembrane(input)), "discourse cohesion"),
});

/**
 * The DISCOURSE SPACETIME of a membrane — its causal geometry, read through relating's substrate
 * temporal geometry (`analysis.geometry`). The membrane is a genuine Lorentzian causal set: each
 * utterance is an EVENT stamped by its position (its TIME), two events are adjacent when their cells
 * share a TERM, and an earlier utterance causally PRECEDES a later one when a chain of shared terms
 * threads them forward (the transitive closure of stage-increasing term-adjacency — `causalOrder`).
 * Unrelated utterances are SPACELIKE (independent, concurrent topics). This is a DIFFERENT structure
 * from the discourse cohesion graph: it is the discourse's TIME, not just its connectivity.
 */

  

  

  

export const discourseSpacetimeSchema = {
  $id: "communicating/discourse-spacetime",
  title: "DiscourseSpacetime",
  type: "object",
  required: ["kind", "events", "timelikePairs", "totalPairs", "orderingFraction", "properTime", "threaded"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-spacetime" },
    events: { type: "integer", minimum: 0 },
    timelikePairs: { type: "integer", minimum: 0 },
    totalPairs: { type: "integer", minimum: 0 },
    orderingFraction: { type: "number", minimum: 0 },
    properTime: { type: "integer", minimum: 0 },
    threaded: { type: "boolean" },
  },
};
export const discourseSpacetimeCarrier = schemaFrom(discourseSpacetimeSchema);

/** The longest causal chain (poset height) of a causal order — exact, by DP over the firing order
 *  (events are stamped in increasing time, so every predecessor is resolved before its successor). */
function properTimeOf(order) {
  const events = order.events.length;
  if (events === 0) return 0;
  const height = new Array(events).fill(1);
  for (let later = 0; later < events; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      if (order.precedes[earlier].includes(later)) height[later] = Math.max(height[later], height[earlier] + 1);
    }
  }
  return Math.max(...height);
}

/** Read a membrane's discourse spacetime: its causal order's ordering fraction (density) and proper
 *  time (deepest thread), through the substrate temporal geometry. */
export function discourseSpacetimeOf(membrane) {
  const order = causalOrder(membrane.map((carrier, position) => firingEvent(membraneMeme(carrier), position)));
  const events = order.events.length;
  const fraction = orderingFraction(order);
  const timelikePairs = fraction.kind === "signcraft.orderingFraction" ? fraction.comparablePairs : 0;
  const totalPairs = fraction.kind === "signcraft.orderingFraction" ? fraction.totalPairs : 0;
  const properTime = properTimeOf(order);
  return Object.freeze({
    kind: "communicating.discourse-spacetime",
    events,
    timelikePairs,
    totalPairs,
    orderingFraction: totalPairs === 0 ? 0 : timelikePairs / totalPairs,
    properTime,
    threaded: events > 0 && properTime === events,
  });
}

/** spacetime — read a membrane's discourse causal geometry (ordering fraction + proper time). */
export const spacetimeAction = operation({
  verb: "spacetime",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane's DISCOURSE SPACETIME: the causal order's ordering fraction (causal density) and proper time (deepest thread), via relating's temporal geometry.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/discourse-spacetime — the membrane as a Lorentzian causal set (analysis.geometry.causalOrder, exact): each utterance is an event stamped by its position, adjacency is shared terms, causal precedence is the transitive closure of stage-increasing term-adjacency. `orderingFraction` = timelike pairs / total pairs (causal density: 1 a sequential chain, low a spacelike spread); `properTime` = the longest causal chain (deepest discourse thread). Grounded in SignCraft's causal order and the corpus's lorentzian-causal-settling.",
  domain: membraneCarrier,
  codomain: discourseSpacetimeCarrier,
  run: (input) =>
    jsonResource(discourseSpacetimeOf(admitMembrane(input)), "discourse spacetime"),
});

/** The mark value of a cell term (a token wrapping a mark), as the information-theoretic outcome label. */
const termLabel = (term) => String(term.mark.value);

/**
 * The CHANNEL INFORMATION of a membrane — communicating read as information theory. With each utterance
 * a (speaker, subject) sample (the enriched membrane cell `(subject, predicate, utterer)`), the membrane
 * is an empirical joint distribution over a SPEAKER alphabet and a SUBJECT alphabet — a communication
 * channel. `mutualInformation` = `I(speaker; subject)` (bits): how much knowing who is speaking tells you
 * about what they speak of — the information the channel actually carries. `0` ⟺ speakers and subjects are
 * independent (everyone talks about everything equally); high ⟺ speakers specialize (each owns a topic).
 * Read through relating's substrate `mutualInformation`.
 */

  

  

  

  

  

    

export const channelInformationSchema = {
  $id: "communicating/channel-information",
  title: "ChannelInformation",
  type: "object",
  required: ["kind", "utterances", "speakers", "subjects", "speakerEntropy", "subjectEntropy", "jointEntropy", "mutualInformation"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.channel-information" },
    utterances: { type: "integer", minimum: 0 },
    speakers: { type: "integer", minimum: 0 },
    subjects: { type: "integer", minimum: 0 },
    speakerEntropy: { type: "number", minimum: 0 },
    subjectEntropy: { type: "number", minimum: 0 },
    jointEntropy: { type: "number", minimum: 0 },
    mutualInformation: { type: "number", minimum: 0 },
  },
};
export const channelInformationCarrier = schemaFrom(channelInformationSchema);

/** Read a membrane's channel information: the mutual information between speaker and subject. */
export function channelInformationOf(membrane) {
  const pairs = membrane.map((carrier) => {
    const memeCell = membraneMeme(carrier);
    return [termLabel(memeCell.object), termLabel(memeCell.subject)]; // [speaker, subject]
  });
  const info = mutualInformation(pairs);
  return Object.freeze({
    kind: "communicating.channel-information",
    utterances: membrane.length,
    speakers: new Set(pairs.map(([speaker]) => speaker)).size,
    subjects: new Set(pairs.map(([, subject]) => subject)).size,
    speakerEntropy: info.entropyX,
    subjectEntropy: info.entropyY,
    jointEntropy: info.jointEntropy,
    mutualInformation: info.mutualInformation,
  });
}

/** channel — read a membrane's channel information: H(speaker), H(subject), and I(speaker; subject). */
export const channelAction = operation({
  verb: "channel",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a membrane as an information CHANNEL: H(speaker), H(subject), and the mutual information I(speaker; subject) — how much who-is-speaking tells you about what-is-spoken-of.",
  description: "Domain: a membrane (an array of utterance carriers) or { membrane: [...] }. Codomain: communicating/channel-information — the membrane as an empirical joint distribution over a speaker alphabet and a subject alphabet (each utterance a (speaker, subject) sample, from the enriched membrane cell). Read through relating's substrate mutualInformation: marginal entropies H(speaker)/H(subject), joint H(speaker,subject), and I(speaker;subject) = H(speaker)+H(subject)-H(speaker,subject) — the information the channel carries (0 = independence, high = speaker specialization). Bits, real-valued (Shannon). Grounds communicating as the information-theory faculty.",
  domain: membraneCarrier,
  codomain: channelInformationCarrier,
  run: (input) =>
    jsonResource(channelInformationOf(admitMembrane(input)), "channel information"),
});
