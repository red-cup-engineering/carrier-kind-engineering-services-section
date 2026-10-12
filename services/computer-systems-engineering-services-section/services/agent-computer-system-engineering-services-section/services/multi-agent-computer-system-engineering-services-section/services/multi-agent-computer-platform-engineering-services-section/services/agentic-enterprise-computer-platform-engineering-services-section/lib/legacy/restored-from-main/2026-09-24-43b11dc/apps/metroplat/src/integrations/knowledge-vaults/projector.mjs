/**
 * knowledge-vault/src/projector — read-dispatch projectors for a directory
 * of markdown notes (a "vault"): the pure vault ingestion profile, the assertion-corner
 * projector that recognizes and reads one as a vault, and its
 * site-directory-grammar specialization. `directoryManifestProjector` (the
 * generic directory-manifest recognizer these restrict) is mounted in the
 * package's read-dispatch catalog (`src/presentation/catalog.mts`) and is
 * supplied by the caller rather than imported here, to avoid a circular
 * import between the catalog and this domain module.
 */
import {
  restrict,

} from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { parse } from "@red-cup-engineering/json-services-section";
import { isDirectoryManifest } from "../filesystem/directory-manifest.mjs";
import { siteDirectoryGrammarOf } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/contracts/site-directory-grammar";
import { MARKDOWN_FILE, vaultIngestionProfileOfFiles } from "./vault.mjs";

/** A knowledge vault: a directory manifest carrying markdown notes, read as
 *  one ingested note collection — assertion corner, scott rung (link-resolution closure).
 *  Takes the mounted `directoryManifestProjector` as its base rather than
 *  importing it (see module docstring). */
export function vaultProjectorFor(directoryManifestProjector) {
  return restrict(directoryManifestProjector, {
    type: "knowledge-vault",
    corner: "assertion",
    rung: "scott",
    recognize: (resource) => {
      try {
        const manifest = parse(resource.content);
        return isDirectoryManifest(manifest) && Object.keys(manifest.files).some((file) => MARKDOWN_FILE.test(file));
      } catch {
        return false;
      }
    },
    read: (resource) => {
      const manifest = parse(resource.content);
      return [vaultIngestionProfileOfFiles(manifest.root, manifest.files)];
    },
  });
}

/** A vault whose own path sits in the `dev`/`content`/`notes` directory
 *  grammar (README.md's "directory grammar"): the same vault ingestion profile as
 *  `vaultProjectorFor`'s result, plus which site it belongs to and its
 *  position in that grammar (`dev/content/notes/` reads differently from a
 *  bare `notes/`). Takes the vault projector it restricts as its base for
 *  the same reason `vaultProjectorFor` takes `directoryManifestProjector` —
 *  restricting the caller-supplied instance (not a sibling import) keeps
 *  `classifyAt`'s no-corner dispatch on a straight chain to the deepest
 *  node, rather than two siblings collapsing to their common ancestor. */
export function siteDirectoryGrammarProjectorFor(vaultProjector) {
  return restrict(vaultProjector, {
    type: "site-directory-grammar",
    corner: "assertion",
    rung: "scott",
    recognize: (resource) => siteDirectoryGrammarOf(resource.path) !== null,
    read: (resource) => {
      const manifest = parse(resource.content);
      const grammar = siteDirectoryGrammarOf(resource.path);
      const vault = vaultIngestionProfileOfFiles(manifest.root, manifest.files);
      return [{ ...grammar, vault }];
    },
  });
}
