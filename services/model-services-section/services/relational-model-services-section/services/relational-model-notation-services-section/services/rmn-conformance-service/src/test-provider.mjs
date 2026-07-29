import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function unusedPort() {
  const socket = createServer();
  await new Promise((accept, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", accept);
  });
  const port = socket.address().port;
  await new Promise((accept, reject) => socket.close((error) => error ? reject(error) : accept()));
  return port;
}

export async function startRmnProviderProcess(options = {}) {
  const port = options.port ?? await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const taskStoreRoot = options.taskStoreRoot ?? mkdtempSync(resolve(tmpdir(), "emsenn-rmn-a2a-test-"));
  const ownsTaskStore = options.taskStoreRoot === undefined;
  const signingRoot = mkdtempSync(resolve(tmpdir(), "emsenn-rmn-a2a-signing-"));
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const keyPath = resolve(signingRoot, "ed25519-private.pem");
  const jwksPath = resolve(signingRoot, "jwks.json");
  const kid = "rmn-semantic-conformance-test-ed25519";
  writeFileSync(keyPath, privateKey.export({ format: "pem", type: "pkcs8" }));
  writeFileSync(jwksPath, JSON.stringify({ keys: [{ ...publicKey.export({ format: "jwk" }), kid, alg: "EdDSA", use: "sig" }] }));
  const child = spawn(process.execPath, [resolve(ROOT, "src/test-provider-server.mjs")], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      BASE_URL: baseUrl,
      AGENT_CARD_SIGNING_KEY: keyPath,
      AGENT_CARD_JWKS: jwksPath,
      AGENT_CARD_SIGNING_KID: kid,
      A2A_TASK_STORE_ROOT: taskStoreRoot,
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const announced = await new Promise((accept, reject) => {
    const timeout = setTimeout(() => reject(new Error(`RMN A2A provider startup timed out: ${stderr}`)), options.timeoutMs ?? 10_000);
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const line = stdout.split(/\r?\n/u)[0];
      if (line) { clearTimeout(timeout); accept(line); }
    });
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("exit", (status) => {
      clearTimeout(timeout);
      reject(new Error(`RMN A2A provider exited during startup (${status}): ${stderr}`));
    });
  });
  let closed = false;
  return {
    baseUrl: announced,
    agentCardUrl: `${announced}/.well-known/agent-card.json`,
    taskStoreRoot,
    async close() {
      if (closed) return;
      closed = true;
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await new Promise((accept) => {
          const timeout = setTimeout(() => { child.kill("SIGKILL"); }, 2_000);
          child.once("exit", () => { clearTimeout(timeout); accept(); });
        });
      }
      if (ownsTaskStore) rmSync(taskStoreRoot, { recursive: true, force: true });
      rmSync(signingRoot, { recursive: true, force: true });
    }
  };
}
