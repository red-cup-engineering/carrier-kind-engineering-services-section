import assert from "node:assert/strict";
import test from "node:test";
import { parseObserveArguments } from "../scripts/observe-bare-cedar-fog-markdown-vaults.mjs";
import { parseSearchArguments } from "../scripts/search-bare-cedar-fog-markdown-vaults.mjs";
import { parseLanguageLightconeSearchArguments } from "../scripts/search-bare-cedar-fog-markdown-language-lightcone.mjs";

test("observation CLI admits explicit bounds and path disclosure", () => {
  assert.deepEqual(parseObserveArguments(["--root", "/repo", "--sample-limit", "2", "--include-paths"]), {
    root: "/repo",
    sampleLimit: 2,
    includePaths: true,
  });
});

test("language-lightcone CLI keeps semantic and carrier bounds explicit", () => {
  assert.deepEqual(parseLanguageLightconeSearchArguments([
    "--root", "/repo",
    "--keyword", "proof path",
    "--keyword", "language cone",
    "--query", "incoming arrows",
    "--depth", "2",
    "--candidate-limit", "300",
    "--no-carrier-reading",
  ]), {
    root: "/repo",
    keywords: ["proof path", "language cone"],
    query: "incoming arrows",
    depth: 2,
    candidateLimit: 300,
    includeCarrierReadings: false,
  });
});

test("search CLI accumulates vault selectors", () => {
  assert.deepEqual(parseSearchArguments(["--root", "/repo", "--query", "cedar", "--vault", "science-services", "--vault", "public-services", "--generation", "current", "--limit", "7"]), {
    root: "/repo",
    query: "cedar",
    vaultIds: ["science-services", "public-services"],
    generation: "current",
    limit: 7,
  });
});
