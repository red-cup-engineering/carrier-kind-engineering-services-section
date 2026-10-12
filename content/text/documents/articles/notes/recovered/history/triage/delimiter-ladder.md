# delimiter ladder — the articulator spec

The ordered split-rules that turn raw text into the 2D base of spans (see
`architecture.md`). This is a **buildable spec**, written to be implemented and
revised. It defines only **structure** — no charges, no rules. Each tier names what
splits it from its parent, the delimiter, the entity it emits, and the edge cases
that bite. v0 choices are marked `v0:`; they are deliberately mechanical and revisable.

## Invariants (hold at every tier)
- Every span carries `[start, end)` character offsets into the **original document**.
  Offsets never drift; finer tiers sub-slice their parent's range. This is what makes
  witnesses thick and lets a diagnostic point back at source.
- Every span records its **tier** and its **parent** (`inside` edge) and its immediate
  **previous sibling** within that parent (`after` edge).
- Splitting is **non-destructive**: concatenating a parent's children (with the
  delimiters that separated them) reproduces the parent's exact text. No span is lost,
  including whitespace and punctuation — they are either their own spans or recorded
  attributes, never silently dropped.
- A span marked **non-prose** (e.g. a code fence) is kept as an entity but not descended
  for prose checks.

## The tiers (coarse → fine)

### Tier 0 — document
The whole input. One root entity. `inside` = none; `after` = none.

### Tier 1 — block
Split the document into blocks.
- **Delimiter:** a blank line — `\n` followed by optional whitespace then `\n`.
- **Emits:** blocks. Each block is typed by a cheap leading-marker scan:
  - `#`…`######` at line start → `heading` (record level h1–h6).
  - ```` ``` ```` / `~~~` fence → `code` block (**non-prose**).
  - `>` at line start → `blockquote`.
  - `-` / `*` / `+` / `N.` at line start → `list-item`.
  - otherwise → `paragraph`.
- **Edge cases:**
  - A single newline inside a paragraph is a soft wrap, **not** a block boundary — it
    is intra-block whitespace. (Markdown reads a lone newline as a space.)
  - `v0:` minimal markup only (the markers above). Full Markdown/AsciiDoc parsing is
    deferred; everything not matched is a `paragraph`. koios-news is Markdown, so this
    tier matters early.

### Tier 2 — sentence
Split a **prose** block (not `code`) into sentences.
- **Delimiter:** a run of terminal punctuation `[.!?]+` followed by whitespace, a
  closing quote/paren then whitespace, or end-of-block.
- **Emits:** sentences.
- **Edge cases (this is the tier with real work):**
  - **Abbreviations:** don't split after `Dr.`, `Mr.`, `Mrs.`, `Ms.`, `e.g.`, `i.e.`,
    `etc.`, `vs.`, `U.S.`, `a.m.`, `p.m.`, … `v0:` a small built-in exception list.
  - **Decimals / versions:** don't split on `.` between digits (`3.14`, `v2.0`).
  - **Ellipsis:** `...` / `…` is not a terminator unless followed by a capital + space.
  - **Terminal inside quotes/parens:** `She said "go."` — the sentence includes the
    closing quote. `v0:` consume a trailing `"`/`'`/`)` into the sentence.
  - **URLs / file paths:** dots inside a non-whitespace token don't split.

### Tier 3 — clause / phrase
Split a sentence into clauses and phrases. This is where "one idea per sentence" gets
measured (clause count), so the tier earns its keep even though it is the loosest.
- **Delimiter:** `[,;:]`, dashes `—` / `–` / `--`, and parenthetical spans `(...)`.
- **Emits:** clauses/phrases.
- **Edge cases:**
  - **Numbers:** a comma between digits (`1,000`) is not a clause boundary.
  - **List commas vs. clause commas:** "red, white, and blue" is one list, not three
    clauses. `v0:` treat every comma as a boundary and accept over-segmentation;
    refine with a list heuristic later. Flag this as the loosest, most-revisable tier.

### Tier 4 — word
Split a clause into words.
- **Delimiter:** whitespace `\s+`. Then peel leading/trailing non-word punctuation
  (`"` `'` `(` `)` `,` `.` `:` `;` `!` `?`) off each token; record peeled marks as
  attributes or their own punctuation spans (non-destructive invariant).
- **Emits:** words (tokens).
- **Edge cases / `v0:` choices:**
  - Contractions (`don't`, `it's`) kept whole.
  - Hyphenated compounds (`well-being`) kept as one word `v0:`.
  - Possessives (`dog's`) kept whole.
  - Record `first-char` and `is-capitalized` as attributes (cheap, used by
    capitalization and `a`/`an` checks; avoids needing a character tier yet).

### Tier 5 — character (deferred)
Only if a check needs sub-word structure. `v0:` expose `first-char` as a word
attribute instead of materializing this tier.

## Edges emitted (the base)
For every span the articulator emits, into the kernel base:
- **inside:** `(span, inside, parent)` — the `Y`-axis containment tree. Converse: `contains`.
- **after:** `(span, after, prevSibling)` — the `X`-axis sequence chain within a parent.
  Converse: `before`.
- These fill `predicate.mjs`'s base fields (`subject-projection` / `object-projection`
  = the edge endpoints; `converse` = the reverse arc). Structural predicates only —
  style predicates layer on top (layer 2, the detectors).

## Open decisions
- **Markup depth in v0:** plain-text + minimal block markers (chosen), vs. a real
  Markdown parser up front. Leaning minimal; revisit when koios-news Markdown stresses it.
- **Abbreviation list source:** built-in `v0:`; could later harvest from `sources/`.
- **List-comma heuristic:** deferred; tier 3 over-segments until then.
- **Output data shape:** the concrete object an articulated span is — to be drafted
  next, as the contract layer 2 (detectors) and the kernel descent consume.
