// communicate — the process faces every language corpus mounts over its communicating
// actions: `runCommunicate` binds argv/stdin/stdout/stderr/exit to the induced dispatch,
// `serveCommunicate` serves the same actions over HTTP. COMMUNICATING_DATA names the data
// root for the invocation ledger; unset disables witnessing.

import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { serve } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";

async function readStdin() {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

export async function runCommunicate(actions, packageName) {
  try {
    const { dispatch } = induceSurface(actions, { packageName });
    const stdin = await readStdin();
    const dataRoot = process.env["COMMUNICATING_DATA"];
    const result = dispatch(process.argv.slice(2), stdin, {
      caller: { transport: "cli", ...(process.env["USER"] === undefined ? {} : { user: process.env["USER"] }) },
      program: "communicate",
      ...(dataRoot === undefined ? {} : { dataRoot }),
    });
    if (result.stdout !== "") process.stdout.write(result.stdout);
    if (result.stderr !== "") process.stderr.write(result.stderr);
    process.exit(result.code);
  } catch (error) {
    process.stderr.write(`communicate: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

export function serveCommunicate(actions, packageName, defaultPort = 16868) {
  const port = Number(process.env["PORT"] ?? defaultPort);
  const dataRoot = process.env["COMMUNICATING_DATA"];
  const induced = induceSurface(actions, { packageName });
  const server = serve(actions, {
    induced,
    title: packageName,
    ...(dataRoot === undefined ? {} : { dataRoot }),
    namespace: packageName,
    caller: { transport: "http" },
    program: "communicate",
  });
  server.listen(port, () => {
    process.stdout.write(`communicate-serve: ${induced.operations.length} operations on http://localhost:${port}/\n`);
  });
  return server;
}
