#!/usr/bin/env node
import process from "node:process";
import { rewriteModuleSpecifierWork } from "../src/becoming/doing/working/software-change.mjs";

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};
const rewrite = args.indexOf("--rewrite-module");
const file = value("--file");
const journalPath = value("--journal");
if (!file || !journalPath || rewrite < 0 || !args[rewrite + 1] || !args[rewrite + 2]) {
  process.stderr.write("usage: aoe-codemod --file <path> --rewrite-module <from> <to> --journal <new-jsonl-path> [--actor <id>] [--write]\n");
  process.exitCode = 2;
} else {
  const receipt = await rewriteModuleSpecifierWork({
    file, from: args[rewrite + 1], to: args[rewrite + 2],
    actor: value("--actor") ?? process.env.USER ?? "local-operator",
    write: args.includes("--write"),
    journalPath,
  });
  process.stdout.write(JSON.stringify(receipt) + "\n");
}
