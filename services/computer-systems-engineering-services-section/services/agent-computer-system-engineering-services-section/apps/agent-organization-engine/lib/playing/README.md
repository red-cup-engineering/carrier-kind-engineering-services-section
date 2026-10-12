# @red-cup-engineering/agentic-play-engine

Run these actions through `multi-agent-engine play <verb>`, or consume the family through `@red-cup-engineering/agentic-orchestration-platform`.
Playing is the **outside boundary faculty** over `@red-cup-engineering/agentic-relation-engine` — the *-autonomous DUALITY and CUT of the meme carrier.

Where `@red-cup-engineering/agentic-communication-engine` is the meme MONOID (meaning, truth order ≤_t) and `@red-cup-engineering/agentic-knowledge-engine` is the meme COMONAD (knowledge order ≤_k), playing is the meme's `*`-autonomous duality: the interaction of a Design with its dual opponent closes the game, giving the cut law of linear logic.
This is the corpus's spiral hinge: convergence to ⊤ = gluing the game = closing animating's turn.

## The one carrier

A **Design** is playing's primary carrier: a partial charge-valuation over a locus tree (`designing/design.schema.json`).
Loci are address-paths into the tree; charges (`potential`, `active`, `stable`, `absurd`) record the Proponent/Opponent/Daimon/none stance at each node.
A Design is playing's meme analog: a partial proof-forest.

The **Behaviour** is the bi-orthogonal closure of a set of Designs — the smallest saturated strategy closed under the cut.
The **Interaction** is the binary cut of two dual Designs — the knowledge-join of their overlapping loci (Girard's cut law).

## The morphism surface (37 verbs)

| subpath | what it covers |
|---|---|
| `@red-cup-engineering/agentic-play-engine` | Structuring carriers, encoding, expressing (CHL terms over Designs) |
| `@red-cup-engineering/agentic-play-engine/ludics` | Core ludics: `design`, `dualize`, `cut`, `interact`, `behave`, `normalize`, `orthogonal`, `compose`, `copycat`, `incarnate`, `fax`, `fax-law`, `identity-law`, `internal-completeness` |
| `@red-cup-engineering/agentic-play-engine/structuring` | Design topology: `focus`, `focusing-duality`, `locativity`, `delocate`, `close`, `coherent` |
| `@red-cup-engineering/agentic-play-engine/running` | Game-running: `superpose`, `chronicles`, `chronicle-convergence`, `classify-fragment`, `in-fragment`, `fragments` |
| `@red-cup-engineering/agentic-play-engine/encoding` | Codecs: Design ↔ JSON, Locus ↔ address-array; `formula`, `session`, `session-compat`, `dual-prop`, `dual-session`, `embed`, `embeddings`, `proves`, `cut-elimination`, `design-leq`, `propose`, `negate-behaviour`, `dual-behaviour` |

`@red-cup-engineering/agentic-play-engine/ludics` is the import recommended for downstream packages (gaming, computing) that build over playing's proof-engine without needing the full surface.

## Usage

```ts
import { designAction, dualizeAction, interactAction, cutAction } from "@red-cup-engineering/agentic-play-engine/ludics";
import { Design, Locus } from "@red-cup-engineering/agentic-play-engine";

// A Design: one potential locus (the root)
const d: Design = { entries: [{ locusKey: "", charge: "potential" }] };

// Dualize — flip Proponent/Opponent polarity
const dPerp = dualizeAction.run(d, {});

// Cut — the knowledge-join at shared loci
const interaction = interactAction.run({ left: d, right: dPerp }, {});
```

## Subpaths

```ts
import { ... } from "@red-cup-engineering/agentic-play-engine";          // full surface + carriers
import { ... } from "@red-cup-engineering/agentic-play-engine/ludics";    // core cut/interact/normalize
import { ... } from "@red-cup-engineering/agentic-play-engine/structuring"; // Design topology
import { ... } from "@red-cup-engineering/agentic-play-engine/running";   // game chronicles
import { ... } from "@red-cup-engineering/agentic-play-engine/encoding";  // Design ↔ JSON codecs
```

## RelMath Realization

Playing's chronicles and interaction traces have a natural finite-causal reading: `analysis.causal.settleCausalSet` distinguishes timelike play sequences from spacelike simultaneous loci, while `probability.markovStationaryIsClosureFixpoint` can witness stable strategy-state loops.
The strongest concrete follow-up is to add these receipts to `@red-cup-engineering/agentic-play-engine/running` chronicle reads without changing the core ludics cut carrier.
