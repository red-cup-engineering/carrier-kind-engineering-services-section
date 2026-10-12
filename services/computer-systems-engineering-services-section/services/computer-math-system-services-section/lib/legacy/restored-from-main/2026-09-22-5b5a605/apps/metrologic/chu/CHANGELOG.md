# Changelog

All notable changes to `@lenticule-science/metrologic/chu/four` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [metrologic 0.3.0]

### Removed

- `chu` and `transform` — the Chu-space carrier, its reads and duality, and the
  Chu(FOUR) category. These duplicated
  `@lenticule-science/articulating/predicating/positing/logic/linear-logic-chu`,
  the executable form of `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean`,
  whose matrix entries are charge carriers (so a space carries its evidence and
  `dual ∘ dual = id` holds as a structural equality). Consumers import that
  module directly; there is no forwarding surface here.
- The `./chu`, `./chu/chu` and `./chu/transform` subpath exports. `./chu/four`
  remains and is the whole of this surface.

## [0.0.1] — unreleased

### Added

- `four` — the Belnap–Ginsberg four-valued bilattice as a reading of `@lenticule-science/metrologic/bilattice`: `FOUR`, the charge⇄name codec (`toCharge` / `fromCharge`), the two involutions (`negate`, `conflate`) and the two lattice orders (`knowledgeJoin`/`knowledgeMeet`, `truthJoin`/`truthMeet`).
  Every operation delegates to a kernel morphism — no re-derived four-valued logic.
- `chu` — Chu spaces over FOUR: `chuSpace` / `fromMatrix`, the reads (`row`, `col`, `extension`), the duality (`transpose`, `dual`), and line-settling (`settleColumn`, `settleRow`).
- `transform` — the category Chu(FOUR): `checkChuTransform`, `chuTransform`, `idTransform`, `composeTransforms`, `dualTransform`.
- Property/law test suites over the exhaustive 4-element alphabet.

This is the clean, kernel-backed lift of the Chu machinery prototyped in `development/active/swarm` (`src/chu.mjs`, `src/chu-transform.mjs`, `src/eavt-chu.mjs`).
