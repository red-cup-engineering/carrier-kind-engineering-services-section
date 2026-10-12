import { languageManifestReceipts } from "@red-cup-engineering/communicating/speaking/listening/algebra/manifest";
import { loadLanguageManifestFile } from "@red-cup-engineering/communicating/speaking/listening/algebra/read-language-manifest";

const manifestUrl = new URL("../data/manifest.json", import.meta.url);

export const manifest = loadLanguageManifestFile(
  manifestUrl,
  "@emsenn/communicating-in-relation-conlang/data/manifest.json",
);

export const receipts = languageManifestReceipts(manifest);

export default manifest;
