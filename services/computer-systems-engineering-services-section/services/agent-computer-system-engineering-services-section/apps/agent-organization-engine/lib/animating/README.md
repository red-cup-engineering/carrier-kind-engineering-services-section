# @red-cup-engineering/agentic-animation-engine

The software-change work component is exported as
`@red-cup-engineering/animating/software-change`. Its `aoe-codemod`
command plans or applies a parser-admitted module-specifier rewrite and
returns SignCell identities, ordered SignChain evidence, a SignGraph of
affected carriers, and a SignCraft settlement. Without `--write` it records
a projected result; with `--write` it checks the observed output. The
JavaScript parser and byte-edit planner remain in the lower code layer.

`aoe-relocate` reads one JSON request per line. A `plan` request supplies
`repositoryRoot`, a capability `placement` with typed before/after owners,
directory `replacements`, explicitly selected active
`files` (`module`, `json`, or `markdown`), optional `symlinks`, and
`journalPath`. An `apply` request supplies that journal path and the same
actor. The same command
also handles `kind: "package-collapse"` with a mapping, selected files, and
obsolete paths. Plans bind source content and directory snapshots; application
rechecks them and verifies written output. The journal records a SignChain
proposal before mutation and an applied or observed telling after reading
the result. Filesystem failures during application leave an unresolved
proposal; they are not automatically rolled back. These requests move paths;
they do not establish architectural ownership or complete consumer closure.
An instance such as OPS can be named as an erroneous before owner, but never
as the after owner of executable capability. The receiving package must declare its `softwareKind` in `package.json`;
AOE binds that source digest to its proposal and refuses a changed or
conflicting declaration. The declared kind and consumers outside the
discovered package-import route are not independent proof of architectural
fitness or complete migration.

For package collapse, mapped bare package exports are checked against
source-discovered JavaScript consumers. Every discovered consumer must be in
`files`; the discovered paths are added to the placement's SignGraph, and
new consumers appearing between proposal and application cause refusal.
This search covers tracked and non-ignored untracked files in a Git worktree,
or the supplied root outside Git. It cannot establish non-JavaScript or
runtime consumer closure.

Run these actions through `multi-agent-engine animation <verb>`, or consume the family through `@red-cup-engineering/agentic-orchestration-platform`.
Animating is the agency reading of `@red-cup-engineering/agentic-relation-engine`: one settling descent read as becoming, doing, working, and governing, then glued into an interior agent that can perceive and act.

It is not endomorphic and not a single morphism.
It traverses the four relating closure regimes as a descent through four agency stages:

| relating closure | void-math object | agency stage | agency face |
|---|---|---|---|
| aperiodic | cell | becoming | animate |
| transfinite | fiber | doing | agential |
| Scott-continuous | charged presheaf | working | agentic |
| strict/finite | glued sheaf | governing | individual |

The bottom codomain is the interior agent: a glued individual sheaf that can be read as a `perceive(input) -> act(output)` loop made of perception, action, and goal.
The individual is settled below and open above: it re-seeds the next-scale spiral through gaming, computing, socializing, and organizing.

## Carriers

Carriers are single-source TypeBox declarations registered through Relating's category kernel.
The software-change JSON schemas generate their declared runtime carriers through
the shared Code renderer; the received carrier must agree with every current
`x-codegen` specification.

`aoe-code-mission` reads `{mission, execution, receiver?}` from standard input.
`execution.dataRoot` names caller-owned persistent custody. It invokes the same
native development lifecycle as the public mission exports. Name one receiving
port, in `execution.receiver` or `receiver`; the lifecycle performs receiving once.

`aoe-codegen --specifications <directory> --out <file> --actor <id> --journal
<new-file.jsonl>` plans generation from schemas with `x-codegen`. Repeat
with `--write` to apply the admitted projection; `--check` only compares an
existing output. The code-layer renderer owns only the pure projection.
This AOE command records the actor, exact input and output identities, location
relations, and whether the result was projected or observed. An actor string is
not yet an organizational authority grant.

The key public carriers include:

- `animating/face` - a boundary-face local section over communicating, knowing, or playing
- `animating/boundary-projection` - the holographic projection of an agent through its faces
- `animating/becoming/animate` - the void/mark read as the first capacity to sense
- `animating/becoming/doing/agential` - a fiber: a sensing-capable node in a goal-directed structure
- `animating/becoming/doing/working/agentic` - a charged presheaf: a goal-bearing perceiver
- `animating/becoming/doing/working/governing/individual` - the glued sheaf: the full agent

## Actions

Each action is a Relating action over those carriers, so CLI, OpenAPI, MCP, and web projections come from the shared Relating boundary machinery.

| verb | stage | what it does |
|---|---|---|
| `animate` | becoming | animate a void mark into a sense-capable cell |
| `prehend` | doing | fold a fiber into a sensing node |
| `perceive` | doing -> working | project input into the agent's world-model |
| `act` | working | execute one perceive-to-act cycle |
| `factor` | working | factor a face's act into locution, illocution, and perlocution |
| `glue` | governing | glue the three faculty-face projections into one individual |
| `face` | governing | settle one faculty membrane into its boundary face |
| `project` | governing | project the individual to its holographic boundary |
| `reseed` | spiral | re-seed the individual into the next spiral scale |

## Usage

```ts
import { actAction, animateAction, perceiveAction } from "@red-cup-engineering/agentic-animation-engine";

const agent = await animateAction.run("my-agent", {});
const perceived = await perceiveAction.run({ agent, input: "signal" }, {});
const result = await actAction.run({ agent, input: "signal" }, {});
```

## Subpaths

```ts
import { glue } from "@red-cup-engineering/agentic-animation-engine";
import { animate } from "@red-cup-engineering/agentic-animation-engine/becoming";
import { prehend } from "@red-cup-engineering/agentic-animation-engine/becoming/doing";
import { labor } from "@red-cup-engineering/agentic-animation-engine/becoming/doing/working";
import { buildAgent } from "@red-cup-engineering/agentic-animation-engine/becoming/doing/working/governing";
```

## RelMath Realization

Animating can now grade perception/action/labor traces with finite RelMath receipts.
The `labor` reading now exposes `cohomology`, a normalized `cohomologyTerms.laplacian` receipt over the generated working predication field, so the Scott-continuous working stage carries its finite H0/H1 ranks, vanishing witness, and Laplacian rank identity as public data.
`analysis.causal.settleCausalSet` and the probability RMN catalog remain available for richer event-order and stochastic operating-loop readings.
