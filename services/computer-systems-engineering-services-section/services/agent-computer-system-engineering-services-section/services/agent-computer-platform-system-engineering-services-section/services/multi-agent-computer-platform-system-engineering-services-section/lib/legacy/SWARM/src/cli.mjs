import { message, traceSummary } from "./index.mjs";

function usage() {
  return [
    "Usage: swarm message <agent> <prompt...> [--root <path>] [--json] [--trace|--no-trace]",
    "",
    "Examples:",
    "  swarm message groq hello",
    "  swarm message nim \"summarize this\" --json",
  ].join("\n");
}

function parse(argv) {
  const args = [...argv];
  const command = args.shift();
  const options = { trace: true };
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--root") {
      i += 1;
      if (!args[i]) throw new Error("--root requires a path.");
      options.root = args[i];
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--trace") {
      options.trace = true;
    } else if (arg === "--no-trace") {
      options.trace = false;
    } else {
      positional.push(arg);
    }
  }
  if (command !== "message") throw new Error(usage());
  const agent = positional.shift();
  const prompt = positional.join(" ").trim();
  if (!agent || !prompt) throw new Error(usage());
  return { agent, prompt, options };
}

function write(stream, text) {
  if (typeof stream === "function") stream(text);
  else stream.write(text);
}

function human(result, showTrace) {
  const lines = [
    result.reply,
    "",
    `Agent: ${result.agent.name} (${result.agent.provider}/${result.agent.model})`,
    `Memory root: ${result.memory.root}`,
    `Subject log: ${result.memory.log}`,
  ];
  if (showTrace) lines.push(`Trace: ${traceSummary(result.trace).join(" -> ")}`);
  lines.push(`Tools: ${result.cognition.toolResults.map((r) => r.tool).join(", ")}`);
  lines.push(`Recalled: ${result.cognition.recalled.length}; Dreams: ${result.cognition.dreams.length}`);
  if (result.office) {
    lines.push(`Office actions: ${result.office.actions.join(", ") || "none"}`);
    lines.push(`Work records: ${result.office.work.length}; Governance decisions: ${result.office.governance.length}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function runCli(argv, io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  try {
    const parsed = parse(argv);
    const result = await message(parsed.agent, parsed.prompt, {
      ...parsed.options,
      cwd: io.cwd,
      env: io.env,
      fetch: io.fetch,
      apiKey: io.apiKey,
      now: io.now,
      id: io.id,
    });
    if (parsed.options.json) write(out, `${JSON.stringify(result, null, 2)}\n`);
    else write(out, human(result, parsed.options.trace));
    return 0;
  } catch (error) {
    write(err, `${error.message}\n`);
    return 1;
  }
}
