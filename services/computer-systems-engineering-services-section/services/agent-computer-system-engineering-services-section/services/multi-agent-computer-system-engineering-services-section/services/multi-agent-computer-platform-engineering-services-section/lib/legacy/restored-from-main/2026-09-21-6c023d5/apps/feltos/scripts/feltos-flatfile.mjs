#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/index";
import { listEntities, readEavtFile, relateFrom } from "@red-cup-engineering/eavt";
import { inspectFlatfileResourceWithProviders } from "../src/flatfile/inspect-resource.mjs";
import { admitFabricationReceipt } from "@red-cup-engineering/jsnode-engine/operations";
import { runDischarge, runLint, runReplay, runShow, runValidate, runWitness, runWitnessLog } from "../src/flatfile/cli/verbs.mjs";

const USAGE = `feltos-flatfile <verb> [args]

  validate <root>
  lint <root>
  show <root> <slug-or-path>
  witness <root> <witness-id>
  witness-log <root> <channel> <at>
  discharge <root> <record-id>
  replay <root>
  admit-fabrication-receipt
  list-entities <flatfile>
  read-imports <flatfile> <entity>
  read-operations <flatfile> <entity>
  inspect-resource
`;

function printAndExit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exitCode = code;
}

function usageError(message) {
  process.stderr.write(`${message}\n\n${USAGE}`);
  process.exitCode = 2;
}

async function main(argv) {
  const [verb, ...rest] = argv;
  if (verb === undefined || verb === "help" || verb === "--help" || verb === "-h") {
    process.stdout.write(USAGE);
    process.exitCode = verb === undefined ? 2 : 0;
    return;
  }
  switch (verb) {
    case "validate":
    case "lint": {
      const [root] = rest;
      if (!root) return usageError(`${verb}: missing <root>`);
      const result = await (verb === "validate" ? runValidate(root) : runLint(root));
      return printAndExit(result, result.diagnostics.length === 0 ? 0 : 1);
    }
    case "show": {
      const [root, target] = rest;
      if (!root || !target) return usageError("show: missing <root> <slug-or-path>");
      const note = await runShow(root, target);
      return printAndExit(note, note === null ? 1 : 0);
    }
    case "witness": {
      const [root, witnessId] = rest;
      if (!root || !witnessId) return usageError("witness: missing <root> <witness-id>");
      const record = await runWitness(root, witnessId);
      return printAndExit(record, record === null ? 1 : 0);
    }
    case "witness-log": {
      const [root, channel, at] = rest;
      if (!root || !channel || !at) return usageError("witness-log: missing <root> <channel> <at>");
      return printAndExit(await runWitnessLog(root, channel, at));
    }
    case "discharge": {
      const [root, recordId] = rest;
      if (!root || !recordId) return usageError("discharge: missing <root> <record-id>");
      const result = await runDischarge(root, recordId);
      return printAndExit(result, result.found ? 0 : 1);
    }
    case "replay": {
      const [root] = rest;
      if (!root) return usageError("replay: missing <root>");
      return printAndExit(await runReplay(root));
    }
    case "list-entities": {
      const [flatfilePath] = rest;
      if (!flatfilePath || rest.length !== 1) return usageError("list-entities: expected <flatfile>");
      return printAndExit(listEntities(readEavtFile(flatfilePath)));
    }
    case "read-imports": {
      const [flatfilePath, entity] = rest;
      if (!flatfilePath || !entity || rest.length !== 2) return usageError("read-imports: expected <flatfile> <entity>");
      return printAndExit(relateFrom(readEavtFile(flatfilePath), entity, "imports"));
    }
    case "read-operations": {
      const [flatfilePath, entity] = rest;
      if (!flatfilePath || !entity || rest.length !== 2) return usageError("read-operations: expected <flatfile> <entity>");
      return printAndExit(relateFrom(readEavtFile(flatfilePath), entity, "has-operation"));
    }
    case "inspect-resource": {
      if (rest.length !== 0) return usageError("inspect-resource: request JSON must arrive on standard input");
      process.stdin.setEncoding("utf8");
      let stdin = "";
      for await (const chunk of process.stdin) stdin += chunk;
      try {
        process.stdout.write(`${JSON.stringify(await inspectFlatfileResourceWithProviders(JSON.parse(stdin)))}\n`);
      } catch (error) {
        process.stderr.write(`feltos-flatfile inspect-resource: ${error.message}\n`);
        process.exitCode = 1;
      }
      return;
    }
    case "admit-fabrication-receipt": {
      if (rest.length !== 0) return usageError("admit-fabrication-receipt: request JSON must arrive on standard input");
      process.stdin.setEncoding("utf8");
      let stdin = "";
      for await (const chunk of process.stdin) stdin += chunk;
      try {
        const request = JSON.parse(stdin);
        process.stdout.write(`${JSON.stringify(await admitFabricationReceipt(request))}\n`);
      } catch (error) {
        process.stderr.write(`feltos-flatfile admit-fabrication-receipt: ${error.message}\n`);
        process.exitCode = 1;
      }
      return;
    }
    default:
      return usageError(`unknown verb: ${verb}`);
  }
}

runMain(({ argv }) => main(argv), {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
