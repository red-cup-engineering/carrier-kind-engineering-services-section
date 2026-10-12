# FizzOS capability concordance

The acceptance benchmark is the union of the dedicated July 12 and August 1
FizzOS test categories, not the current package's implementation plan. The
machine-readable register in `capability-concordance.json` records all 50
distinct archived categories and names both a current implementation module and
a current test file for each. `npm run verify:capabilities` derives the full
union from the archived source trees and fails if any category, module, test,
public export, or executable disappears. In a packed install, the sealed
register and shipped tests provide the proof without shipping the legacy
corpus.

The current package meets the archived breadth while strengthening its form:

- all 50 archived behavior categories have current evidence, while the public
  surface is reduced to 41 one-to-one current module paths with no aliases;
- optional systems compose through explicit capabilities instead of a
  monolithic scene;
- game data, runtime policy, transport, persistence, and federation have
  separate boundaries;
- world transitions remain immutable and deterministic;
- contradictory evidence is represented explicitly with FOUR;
- the live HTTP service and client are tested end to end;
- the archived 26,880-tick horizon is replayed twice, exactly, while immutable
  checkpoints bound the active trace;
- the package has no runtime dependencies and no build step.

Some names in the archive were domain-flavored tests of general engine laws
(`farstone-arcs`, `farstone-climate`, `depths`). Their current evidence is the
generalized campaign, clock, and game-definition machinery. Teraum remains a
real data-defined example. Farstone itself remains a domain-owned public game,
as the custody catalog requires.
