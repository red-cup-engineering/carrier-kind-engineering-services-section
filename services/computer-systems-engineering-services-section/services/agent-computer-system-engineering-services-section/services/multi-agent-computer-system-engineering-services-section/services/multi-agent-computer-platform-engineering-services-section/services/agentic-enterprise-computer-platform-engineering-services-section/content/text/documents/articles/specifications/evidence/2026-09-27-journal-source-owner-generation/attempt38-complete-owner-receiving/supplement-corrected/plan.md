# Supplement fixture correction, frozen product

The original post-generation supplement recorded 18/20 passing observations. Four observations are not acceptance evidence: initialization comparison, line capacity, batch capacity, and aggregate source capacity. They used canonicalJson(value).text even though the existing shared API returns a string. The invalid byte helper measured the literal undefined plus LF, causing misleading passing line/batch refusals and preventing initial aggregate publication; the initialization assertion compared against that same literal.

Correct only the fixture API call by removing .text at those two uses, add independent positive single-entry controls and byte-length sanity assertions, and execute only those four affected checks against exactly the unchanged candidate. Preserve the original failing and misleading results. This is assessment-tool correction, not product behavioral repair or source-provider feedback. No generation is invoked. Original pre-generation fixtures remain untouched.

Commit corrected fixtures and execution profile before execution. The live checkout package drift remains excluded by its immutable staged mount and recorded explicitly. No total is represented as a new blind pre-generation result.

Before the corrected observation could launch, guard checks detected additional shared-checkout changes in substrate.mjs, canonical-json.mjs and is-json-value.mjs. No corrected fixture ran. Recover the exact original hashed bytes from prior recorded input/stage artifacts and mount read-only snapshots of every protected runtime dependency. Record original source, digest and current checkout drift. This pins the assessment to its generation dependency set; it does not establish compatibility with the changed live checkout.
