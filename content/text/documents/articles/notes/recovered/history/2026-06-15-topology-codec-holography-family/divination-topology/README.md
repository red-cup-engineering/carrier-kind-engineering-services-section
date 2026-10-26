# @561-group/divination-topology

The divination domain as mathematics, mounting the astrology vocabulary
from `@561-group/astrology-topology`.

- **tarot** — the deck as a 78-element structured set (22 majors numbered
  0–21; 4 suits × 14 ranks); spreads as finite maps from named positions to
  draws. The seeded draw (`drawCards`, `dailySpread`) is a deterministic
  Fisher–Yates whose provenance is the seed and method — a daily draw is a
  checkable claim, reproducible by anyone holding the seed. Physical draws
  carry their own provenance instead. The spread record matches the polity's
  `encoding-a-tarot-spread` skill (spread, date, positions of
  position/card/orientation).
- **numerology** — iterated digit-sum reduction with the conventional master
  numbers {11, 22, 33} as exempt terminals. The whole orbit is recorded; the
  steps are part of the reading.
- **indicators** — the `DailyIndicators` carrier: the Routine Read's canon
  of required indicators (Moon phase and sign, one featured aspect or
  ingress, one tarot card, the date's reduction, a cited lection) plus
  optional synthesized signals (dream fragment, historical echo, elemental
  signature, metaphor object, color tone), each stamped with its
  synthesizer — synthesized texture is still a claim about what was
  synthesized, by what.

The diviner's deontics (cite sources of symbols; distinguish reflection
from prediction) consume this carrier: a reading's gates check that every
required indicator is present, cited, and woven.
