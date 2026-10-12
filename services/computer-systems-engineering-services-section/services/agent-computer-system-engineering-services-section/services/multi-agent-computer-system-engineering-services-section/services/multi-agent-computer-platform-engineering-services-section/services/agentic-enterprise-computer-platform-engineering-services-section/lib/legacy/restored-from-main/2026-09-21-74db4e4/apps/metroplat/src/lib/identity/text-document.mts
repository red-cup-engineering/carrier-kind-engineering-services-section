/** Bounded JCS Merkle representation for text documents larger than one value envelope. */
import { addressCanonicalJson, type ArtifactRef, type ArtifactSource } from "./artifact-ref.mts";
import { canonicalizeJsonValue } from "./canonical-json.mts";
import { isIdentityWitness } from "./judgment.mts";

export const TEXT_DOCUMENT_LEAF_BYTES = 65_536;
export const TEXT_DOCUMENT_BRANCH_WIDTH = 128;

export interface AddressedTextDocument {
  readonly ref: ArtifactRef;
  readonly utf8Bytes: number;
  readonly leaves: number;
  readonly artifacts: readonly ArtifactSource[];
}

function artifact(value: unknown): ArtifactSource {
  const canonical = canonicalizeJsonValue(value);
  if (!isIdentityWitness(canonical)) throw new TypeError(`${canonical.code} at ${canonical.path}: ${canonical.message}`);
  const addressed = addressCanonicalJson(canonical.value);
  if (!isIdentityWitness(addressed)) throw new TypeError(`${addressed.code} at ${addressed.path}: ${addressed.message}`);
  return Object.freeze({ ref: addressed.value.ref, canonicalText: canonical.value.text });
}

/** Split without bisecting a Unicode scalar, under the identity profile's string bound. */
function textLeaves(text: string): readonly string[] {
  const leaves: string[] = [];
  let current = "";
  let bytes = 0;
  for (const scalar of text) {
    const scalarBytes = Buffer.byteLength(scalar, "utf8");
    if (bytes + scalarBytes > TEXT_DOCUMENT_LEAF_BYTES && current !== "") {
      leaves.push(current);
      current = "";
      bytes = 0;
    }
    current += scalar;
    bytes += scalarBytes;
  }
  if (current !== "" || leaves.length === 0) leaves.push(current);
  return Object.freeze(leaves);
}

/**
 * Address arbitrary UTF-8 text as bounded canonical JSON values. The returned
 * reference names a descriptor whose Merkle root transitively commits every
 * leaf; `artifacts` is the create-only source set a store may persist.
 */
export function addressTextDocument(text: string): AddressedTextDocument {
  const sources = new Map<ArtifactRef, ArtifactSource>();
  const leaves = textLeaves(text);
  let level = leaves.map((leafText, index) => artifact(Object.freeze({
    kind: "metroplat.identity.text-document-leaf" as const,
    version: 1 as const,
    index,
    utf8Bytes: Buffer.byteLength(leafText, "utf8"),
    text: leafText,
  })));
  for (const source of level) sources.set(source.ref, source);

  let depth = 0;
  while (level.length > 1) {
    const next: ArtifactSource[] = [];
    for (let offset = 0; offset < level.length; offset += TEXT_DOCUMENT_BRANCH_WIDTH) {
      const children = level.slice(offset, offset + TEXT_DOCUMENT_BRANCH_WIDTH).map((source) => source.ref);
      const branch = artifact(Object.freeze({
        kind: "metroplat.identity.text-document-branch" as const,
        version: 1 as const,
        depth,
        children: Object.freeze(children),
      }));
      sources.set(branch.ref, branch);
      next.push(branch);
    }
    level = next;
    depth += 1;
  }

  const utf8Bytes = Buffer.byteLength(text, "utf8");
  const descriptor = artifact(Object.freeze({
    kind: "metroplat.identity.text-document" as const,
    version: 1 as const,
    encoding: "utf-8" as const,
    utf8Bytes,
    leaves: leaves.length,
    root: level[0]!.ref,
  }));
  sources.set(descriptor.ref, descriptor);
  return Object.freeze({ ref: descriptor.ref, utf8Bytes, leaves: leaves.length, artifacts: Object.freeze([...sources.values()]) });
}
