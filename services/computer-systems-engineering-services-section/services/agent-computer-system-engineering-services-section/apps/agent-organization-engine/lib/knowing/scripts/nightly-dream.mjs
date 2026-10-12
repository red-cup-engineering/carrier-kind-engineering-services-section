#!/usr/bin/env node
// The node's nightly finite dream: once a night, re-read the settled records admitted since the
// last dream, open each latent cell as an unsettled question for the office that owns it, and
// record the run. Run by the node job `nightly-dream`; `--dry-run` reads and dreams, prints the run
// record, and writes nothing. Every section, office, record class and threshold is an argument.
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { latentCellDream, observation, task } from "../src/dreaming/index.mjs";
import { openingsOfBoard, runNightlyDream } from "../src/dreaming/nightly.mjs";
import { noEvidence } from "@red-cup-engineering/signchain/bilattice";

const agent = "nightly-dream";

const options = {
  "record-reader": { type: "string" },
  "record-writer": { type: "string" },
  "record-class": { type: "string", multiple: true, default: [] },
  "section": { type: "string", multiple: true, default: [] },
  "office": { type: "string", multiple: true, default: [] },
  "fallback-office": { type: "string", default: "chief-engineering-officer" },
  "as": { type: "string" },
  "cursor-class": { type: "string", default: "nightly-dream-cursor" },
  "run-class": { type: "string", default: "nightly-dream-run" },
  "pressure-file": { type: "string", default: "/proc/pressure/io" },
  "min-support": { type: "string", default: "2" },
  "max-proposals": { type: "string", default: "25" },
  "max-terms": { type: "string", default: "5000" },
  "max-pressure": { type: "string", default: "60" },
  "dry-run": { type: "boolean", default: false },
};

/** The window's records as memory terms: each record's term is the subject, its topics the object. */
function dream(records, settings) {
  return latentCellDream(records.map((record) => observation({
    observer: agent,
    task: task({ subject: record.term, predicate: "remembers", object: record.topics }),
    evidence: noEvidence,
  })), { ...settings, agent, observer: agent, at: agent });
}

/** Every board thread the dream opened, read whole through `work-board`, page by page. */
async function boardThreads(call) {
  const threads = [];
  let after;
  do {
    const page = await call("work-board", { kind: "ask", tag: "nightly-dream", full: true, limit: 200, ...(after === undefined ? {} : { after }) });
    threads.push(...page.threads);
    after = page.next;
  } while (after !== undefined);
  return threads;
}

function positive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`--${name} is a positive number`);
  return number;
}

/** Bind the run's ports to the node: its record reader and writer verbs and the board's verbs. */
export function nodePorts({ call, values }) {
  const as = values.as === undefined ? {} : { as: values.as };
  const write = async (recordClass, record) => {
    await call(values["record-writer"], { recordClass, record });
    return Buffer.byteLength(JSON.stringify(record));
  };
  return {
    readPressure: () => readFile(values["pressure-file"], "utf8"),
    readCursor: async () => {
      const { records } = await call(values["record-reader"], { recordClass: values["cursor-class"], after: null, through: null, limit: 1, latest: true });
      return records.at(-1)?.cursor ?? null;
    },
    readRecords: (query) => call(values["record-reader"], query),
    readOpenings: async () => openingsOfBoard(await boardThreads(call)),
    openOnBoard: (opening) => call("work-open", { ...opening, ...as }),
    writeCursor: (cursor) => write(values["cursor-class"], { kind: "knowing.nightly-dream.cursor", cursor }),
    writeRunRecord: (run) => write(values["run-class"], run),
  };
}

export async function main(argv, { call, output = process.stdout } = {}) {
  const { values } = parseArgs({ args: argv, options, allowPositionals: false });
  if (values["record-reader"] === undefined) throw new TypeError("--record-reader names the node's settled-record reader verb");
  if (values["record-writer"] === undefined && !values["dry-run"]) throw new TypeError("--record-writer names the verb that admits the cursor and the run record");
  if (values["record-class"].length === 0) throw new TypeError("--record-class names at least one record class to read");
  const offices = Object.fromEntries(values.office.map((pair) => {
    const equals = pair.indexOf("=");
    if (equals < 1) throw new TypeError("--office is <section>=<office>");
    return [pair.slice(0, equals), pair.slice(equals + 1)];
  }));
  const caller = call ?? await nodeCaller();
  const { status, record } = await runNightlyDream({
    ports: nodePorts({ call: caller, values }),
    dream,
    options: {
      recordClasses: values["record-class"],
      sections: values.section,
      offices,
      fallbackOffice: values["fallback-office"],
      minSupport: positive(values["min-support"], "min-support"),
      maxProposals: positive(values["max-proposals"], "max-proposals"),
      maxTerms: positive(values["max-terms"], "max-terms"),
      maxPressure: positive(values["max-pressure"], "max-pressure"),
      dryRun: values["dry-run"],
    },
  });
  output.write(`${JSON.stringify(record)}\n`);
  return status;
}

/** Call node verbs as the node's issued machine client (MCP_ORIGIN, MCP_CLIENT_ID, MCP_CLIENT_SECRET). */
async function nodeCaller() {
  const { callMcpTool } = await import("@red-cup-engineering/mcp-engineering-services-section/scripts/call-tool");
  return (tool, input) => callMcpTool({ origin: process.env.MCP_ORIGIN, clientId: process.env.MCP_CLIENT_ID, clientSecret: process.env.MCP_CLIENT_SECRET, tool, input });
}

// The job runs this script through the release's node_modules link, so compare real paths.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
