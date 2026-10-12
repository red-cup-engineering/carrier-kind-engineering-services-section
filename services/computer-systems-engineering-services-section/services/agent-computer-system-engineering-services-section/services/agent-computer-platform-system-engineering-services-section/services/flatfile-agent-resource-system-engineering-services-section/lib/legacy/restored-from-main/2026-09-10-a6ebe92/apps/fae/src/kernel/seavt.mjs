import { identifySeavtSemanticContent, seavt as seavtStrict } from "@red-cup-engineering/witness-journal-entry-service";
import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";

// The real, installed witness-journal-entry-service's seavt() admits only
// strict "Three Dots and a Dash" Semiotic Resource Name surfaces for
// e/a/v (bare ASCII-alphanumeric atoms, or atoms joined by "."/":"/"-";
// any "_" is an unconditional escape-hatch refusal, and any other
// character — a Tier A path's "/", an ni: URI's "/" and ";" — is a
// grammar violation). A real FARS witness's target and its own content
// identity are never SRN surfaces on their own. Every byte of the raw
// coordinate survives losslessly as one bare SRN atom spelled in
// lowercase hex: a hex digit is itself an ASCII alphanumeric, so the
// whole encoded string is always exactly one grammar-legal atom, for any
// input, unconditionally. kernel/event-log.mjs decodes it back on read;
// PyFARS's kernel/seavt.py's encode_srn_atom/decode_srn_atom mirror this
// codec byte-for-byte, so the physical file either language writes stays
// readable, and its real e/a/v recoverable, by the other's reader.

// Build one strict SEAVT row from real (not pre-SRN-safe) e/a/v
// coordinates: encode, then compose the installed package's own seavt()
// unchanged — no local reimplementation of SRN grammar, row shaping, or
// semantic content identification.
export function seavt(entity, attribute, value, time) {
  return seavtStrict(jsonToTerm(entity), jsonToTerm(attribute), jsonToTerm(value), time);
}

export { identifySeavtSemanticContent };
