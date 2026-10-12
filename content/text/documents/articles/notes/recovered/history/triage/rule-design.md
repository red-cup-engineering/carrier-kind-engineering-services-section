# rule design — what makes a koine rule worth having

The rules in koine's first build (8 substitutions, 8 banned adverbs, 4 doublets,
sentence-length, passive-voice) are a deliberate SUBSET, picked only to exercise each Vale
family end to end. They are the random part. This note thinks about the rules worth
keeping — ones that earn koine's machinery instead of being a word blocklist a flat linter
could run.

**Design**, not derived fact. Where it cites our standard, the facts are in
`sources/ptgae-canonical/.../style-guide.md` and `sources/skills/writing-ptgae.SKILL.md`.

## The test for a good rule

A rule earns its place if it uses something koine has that a flat linter does not. There
are five such levers. A lexical ban (no "utilize") uses none of them — it is fine as a
cheap word-tier check, but it is not why koine exists.

### 1. Implication closure → rule hierarchies, not a flat list
`cohere` closes `specialization`, so a specific violation lights up the general rule it
serves, and the document verdict aggregates honestly. So rules should be ORGANIZED into the
hierarchy the style guide already implies, not dumped flat:

```
reads-well
├── is-plain
│   ├── uses-common-words   ⊇ {substitutions, no-undefined-jargon}
│   ├── active-voice
│   └── concrete-and-specific ⊇ {no-vague-placeholder, no-filler-adverb}
├── is-concise
│   ├── no-padding          ⊇ {doublets, hidden-verbs/nominalizations, redundant-qualifiers}
│   └── one-idea-per-unit   ⊇ {one-idea-per-sentence, one-idea-per-paragraph}
├── is-consistent           (needs the entity-set E — see lever 4)
│   ├── same-phrase-for-same-thing
│   ├── consistent-contractions
│   └── defined-before-used
└── is-navigable
    ├── scannable-headings
    └── progressive-disclosure
```

This is the real payoff of closure: "is this draft plain?" is answered by what its leaves
settled, with the path showing why.

### 2. The ⊤ conflict → encode genuinely opposed guidance
`⊤` is koine's signature move. A good rule set deliberately includes guidance that can
collide on one span, so `⊤` means "a human should decide," not a bug. Real tensions in our
own standard:
- **conciseness vs clarity** — "cut this qualifier" (no-padding) vs "this qualifier is
  load-bearing / define this term" (concrete-and-specific) on the same span.
- **register** — the guide allows common contractions (plain, friendly) but technical
  registers avoid them; "use-contraction" vs "avoid-contraction" → `⊤` = "pick a register."
- **active-voice vs agent-unknown** — the guide says active voice UNLESS the actor is
  genuinely unknown/unimportant. So passive should not be a flat `f` (see lever 5).

### 3. The fold (tiers) → decide at the natural tier; use structure, not proxies
A rule should live at the tier it can actually judge, and localize by folding. The clearest
win: **one-idea-per-sentence** should NOT be word-count (25 words is a proxy). koine has a
clause tier — count a sentence's independent clauses, and when over budget, fold to point at
the offending clause. That is the real rule the style guide states ("one idea per sentence"),
measured with structure we already have, not a syllable heuristic.

### 4. The entity-set E (accumulate) → the cross-span rules Vale can only fake
These are our standard's actual rules, and they need cross-span identity:
- **same-phrase-for-same-thing** — the SKILL says "use the same exact phrase for the same
  thing." Group occurrences by referent in E; flag when one referent takes two surface
  forms. (v0: surface synonyms via a small same-thing table; later: coreference.)
- **defined-before-used** — an acronym/jargon term used before its definition. Needs E plus
  the `after` order. This is the `conditional` family done honestly.
- **full-name-then-surname** — first mention full + linked, later mentions surname (guide
  lines on names). First-occurrence detection over E.
- **consistent-contractions** — both "don't" and "do not" present → pick one. E over both forms.

### 5. ⊥ honesty → abstain when the standard says "it depends"
A flat linter must say yes/no. koine can say `⊥` (unsure) and let the fold or a human take
it. Rules should use this instead of crying wolf:
- **passive-voice** → `⊥`, not `f`. The guide explicitly permits passive when the agent is
  unknown. `⊥` means "look here," and combined with a context rule can resolve (or become `⊤`).
- **hedges** (very, clearly, fairly) → weak signals. Better as `⊥`/low-severity, or gated to
  a formal register, than a hard `f`. A hard ban on "very" is the crudest kind of rule.

## What to build next (the rules that earn it)

Priority order, each tagged with the lever it exercises:

1. **one-idea-per-sentence** by clause count (lever 3) — replaces the word-count proxy.
2. **same-phrase-for-same-thing** (lever 4) — the flagship cross-span rule; the thing Vale
   cannot do and our standard explicitly asks for.
3. **the implication hierarchy** (lever 1) — re-home the existing leaf rules under the tree
   above so the document verdict is meaningful.
4. **register conflict** (lever 2) — a real `⊤` between contraction-use and a chosen register.
5. **defined-before-used** (lever 4) — acronym/jargon ordering over E.
6. **demote the hard bans** (lever 5) — hedging adverbs and passive become `⊥`/soft, not `f`.

Then the bulk lexical corpus (the 107 substitutions, 21 adverbs) loads under
`uses-common-words` as the cheap tier that settles first — present, but not the point.
