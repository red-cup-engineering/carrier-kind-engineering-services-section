#!/usr/bin/env node
import { engine, engineNames, dispatch, serve } from "./index.mjs";

async function main() {
  const [name, command, ...args] = process.argv.slice(2);
  if (name === undefined || ["help", "--help", "-h"].includes(name)) {
    process.stdout.write(`multi-agent-engine <engine> <verb> [flags]\nmulti-agent-engine [<engine>] serve\nEngines: ${engineNames.join(", ")}\n`);
    return;
  }
  const options = {
    dataRoot: process.env.AGENTIC_DATA,
    caller: { transport: command === "serve" || name === "serve" ? "http" : "cli" },
    program: `multi-agent-engine ${name}`,
  };
  if (name === "serve" || command === "serve") {
    const server = serve({ ...options, ...(name === "serve" ? {} : { name }) });
    const port = Number(process.env.PORT ?? 8787);
    server.listen(port, () => process.stdout.write(`multi-agent-engine: http://localhost:${server.address().port}/\n`));
    return;
  }
  if (command === undefined || ["help", "--help", "-h"].includes(command)) {
    process.stdout.write(`${JSON.stringify(engine(name).discovery, null, 2)}\n`);
    return;
  }
  let stdin = "";
  if (!process.stdin.isTTY) {
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) stdin += chunk;
  }
  if (name === "knowledge" && ["dream-stream", "cycle-stream"].includes(command)) {
    const { streamDream, streamCycles } = await import("./knowledge-streams.mjs");
    process.exitCode = await (command === "dream-stream" ? streamDream : streamCycles)(args, stdin);
    return;
  }
  const result = await dispatch(name, [command, ...args], stdin, options);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.code;
}

main().catch((error) => {
  process.stderr.write(`multi-agent-engine: ${error.message}\n`);
  process.exitCode = 1;
});
