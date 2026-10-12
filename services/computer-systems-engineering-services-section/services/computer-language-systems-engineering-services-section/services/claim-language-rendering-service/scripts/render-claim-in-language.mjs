#!/usr/bin/env node
// render-claim-in-language.mjs — one claim, one language fiber, one typed
// receipt on stdout. No --text prints an obstruction receipt (a fiber
// cannot generate surface text, per src/fiber-registry.mjs) rather than
// fake a translation; --obstruction-kind/--obstruction-detail record why.
// With --text, --produced-by says where it came from ("fiber", or
// "inference-dispatch:<provider>" — pass --provider to derive it); the
// fiber's own read/judge re-reads the text regardless of that label.

import { readClaim } from "../src/claim-store.mjs";
import { loadFiber } from "../src/fiber-registry.mjs";
import { buildReceipt } from "../src/render-claim-in-language.mjs";

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      flags[arg.slice(2)] = argv[++i];
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  const [claimFilePath, claimId, fiberName] = positional;
  if (!claimFilePath || !claimId || !fiberName) {
    process.stderr.write(
      "usage: render-claim-in-language.mjs <claimFile> <claimId> <fiber> [--text T --produced-by P [--provider ID]] [--obstruction-kind K --obstruction-detail D]\n",
    );
    process.exitCode = 2;
    return;
  }

  const { subject, claim } = await readClaim(claimFilePath, claimId);
  const fiber = await loadFiber(fiberName);

  const hasText = typeof flags.text === "string";
  const producedBy = hasText
    ? flags["produced-by"] ?? (flags.provider ? `inference-dispatch:${flags.provider}` : null)
    : null;
  if (hasText && !producedBy) {
    process.stderr.write("--text requires --produced-by (or --provider, from which producedBy is derived)\n");
    process.exitCode = 2;
    return;
  }

  const obstruction = hasText
    ? null
    : (flags["obstruction-kind"] || flags["obstruction-detail"])
      ? { kind: flags["obstruction-kind"] ?? "unspecified", detail: flags["obstruction-detail"] ?? "" }
      : null;

  const receipt = buildReceipt({
    subject,
    claimId,
    claim,
    fiber,
    text: hasText ? flags.text : null,
    producedBy,
    obstruction,
  });

  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { main, parseArgs };
