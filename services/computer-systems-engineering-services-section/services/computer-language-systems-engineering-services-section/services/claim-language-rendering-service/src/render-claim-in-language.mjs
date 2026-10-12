// render-claim-in-language.mjs — one claim, one fiber, one typed receipt.
// Per the metroplat translation law (design note §5.3/§6.5/AD-39): a
// translated carrier is a language presentation over the source artifact,
// carrying a typed judgment, declared validation scope, and loss profile —
// never a second truth. A fiber only JUDGES a candidate rendering (see
// fiber-registry.mjs); the published fibers do not produce one, so this module never invents
// text — `text` must already be supplied, and the fiber's own read/judge
// settles the receipt's `judgment`, never this module's opinion.

import { read } from "@lenticule-science/panini";

const VALIDATION_SCOPE =
  "surface-form parseability and the target fiber's own grammaticality " +
  "judgment (closed-class tags, arc licensing, determiner/preposition " +
  "well-formedness) under its compiled bundle. Open-class tokens absent " +
  "from the fiber's lexicon fall to the fiber's documented default " +
  "noun-tag floor rather than failing to parse, so a grammatical verdict " +
  "here does not confirm semantic equivalence with the source claim -- " +
  "no back-translation, bilingual judge, or meaning-preservation check " +
  "is performed.";

// Every leaf path in `value`, dotted, rooted at `prefix`.
function leafPaths(value, prefix) {
  if (value === null || typeof value !== "object") return [prefix];
  const entries = Array.isArray(value)
    ? value.map((v, i) => [`[${i}]`, v])
    : Object.entries(value);
  if (entries.length === 0) return [prefix];
  return entries.flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
}

/** Claim fields a plain surface-text rendering structurally cannot carry
 * (everything but the proposition's object, which is what gets rendered). */
function structuralLossProfile(claim) {
  return leafPaths(claim, "").filter((p) => p !== "proposition.object");
}

function sourceOf(subject, claimId, claim) {
  return Object.freeze({
    subject,
    claimId,
    citation: claim.provenance?.citation ?? null,
    assertedAt: claim.time?.asserted ?? null,
  });
}

/**
 * Build the typed translation receipt for one claim rendered through one
 * fiber. `fiber` is a loaded fiber-registry.mjs record. `text`/`producedBy`
 * describe an already-obtained candidate rendering (omit both for an
 * obstruction receipt); `obstruction` supplies the obstruction detail when
 * no candidate rendering was obtained (e.g. a bought-glass dispatch
 * refusal) — never invented text.
 */
export function buildReceipt({ subject, claimId, claim, fiber, text = null, producedBy = null, obstruction = null }) {
  const source = sourceOf(subject, claimId, claim);
  const target = Object.freeze({ fiber: fiber.fiber, version: fiber.version });

  if (text === null) {
    return Object.freeze({
      source,
      target,
      rendering: Object.freeze({ text: null, producedBy: "obstruction" }),
      judgment: Object.freeze({
        parsedByFiber: false,
        grammaticality: null,
        validationScope: "no candidate rendering was obtained; nothing was re-read through the fiber",
        lossProfile: leafPaths(claim, ""),
      }),
      obstruction: Object.freeze(
        obstruction ?? { kind: "no-renderer", detail: `no candidate rendering was supplied for fiber "${fiber.fiber}" and none of the published fibers generates text (see fiber-registry.mjs for the unpublished English realizer in legacy)` },
      ),
    });
  }

  const reading = read(text, fiber.bundle);
  const parsedByFiber = reading.parse.words.length > 0;
  const grammatical = parsedByFiber && reading.grammaticality.status === "grammatical";

  return Object.freeze({
    source,
    target,
    rendering: Object.freeze({ text, producedBy }),
    judgment: Object.freeze({
      parsedByFiber,
      grammaticality: reading.grammaticality,
      validationScope: VALIDATION_SCOPE,
      lossProfile: structuralLossProfile(claim),
    }),
    obstruction: grammatical
      ? null
      : Object.freeze({
          kind: parsedByFiber ? "ungrammatical-rendering" : "unparseable-rendering",
          detail: parsedByFiber
            ? `the fiber's own grammaticality judgment was "${reading.grammaticality.status}", not "grammatical": ${JSON.stringify(reading.grammaticality.violations)}`
            : `the fiber tokenized zero words from the candidate rendering ${JSON.stringify(text)}`,
        }),
  });
}
