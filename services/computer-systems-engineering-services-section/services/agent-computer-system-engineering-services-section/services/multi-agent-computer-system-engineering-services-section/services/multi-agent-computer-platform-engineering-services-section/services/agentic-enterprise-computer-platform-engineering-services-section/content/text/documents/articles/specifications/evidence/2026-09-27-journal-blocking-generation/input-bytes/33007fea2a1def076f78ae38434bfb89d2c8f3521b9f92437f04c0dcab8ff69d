/** Bounded canonical-JSON Merkle representation for text documents larger than one value envelope. */
import { addressArtifact } from "./index.mjs";

export const TEXT_DOCUMENT_LEAF_BYTES = 65_536;
export const TEXT_DOCUMENT_BRANCH_WIDTH = 128;

function artifact(value) {
  const addressed = addressArtifact(value);
  return Object.freeze({ ref: addressed.ref, canonicalText: addressed.canonical.text });
}

/** Split without bisecting a Unicode scalar, under the identity profile's string bound. */
function textLeaves(text) {
  const leaves = [];
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
export function addressTextDocument(text) {
  const sources = new Map();
  const leaves = textLeaves(text);
  let level = leaves.map((leafText, index) => artifact(Object.freeze({
    kind: "metroplat.identity.text-document-leaf",
    version: 1,
    index,
    utf8Bytes: Buffer.byteLength(leafText, "utf8"),
    text: leafText,
  })));
  for (const source of level) sources.set(source.ref, source);

  let depth = 0;
  while (level.length > 1) {
    const next = [];
    for (let offset = 0; offset < level.length; offset += TEXT_DOCUMENT_BRANCH_WIDTH) {
      const children = level.slice(offset, offset + TEXT_DOCUMENT_BRANCH_WIDTH).map((source) => source.ref);
      const branch = artifact(Object.freeze({
        kind: "metroplat.identity.text-document-branch",
        version: 1,
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
    kind: "metroplat.identity.text-document",
    version: 1,
    encoding: "utf-8",
    utf8Bytes,
    leaves: leaves.length,
    root: level[0].ref,
  }));
  sources.set(descriptor.ref, descriptor);
  return Object.freeze({ ref: descriptor.ref, utf8Bytes, leaves: leaves.length, artifacts: Object.freeze([...sources.values()]) });
}
