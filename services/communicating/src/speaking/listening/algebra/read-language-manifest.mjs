import { readFileSync } from "node:fs";

import { loadLanguageManifest } from "./manifest.mjs";

// Was manifest.mjs's own loadLanguageManifestFile -- the one disk read that module mixed with
// its otherwise-pure schema/receipt surface, moved out per the house's hull/kernel split
// (data/records/house-architecture-norms.json, "hull-never-imports-kernel"): manifest.mjs's own
// exports (loadLanguageManifest, the receipt functions, the schema) never needed node:fs
// themselves and now stay hull.
export function loadLanguageManifestFile(url, context = url.href) {
  return loadLanguageManifest(JSON.parse(readFileSync(url, "utf8")), context);
}
