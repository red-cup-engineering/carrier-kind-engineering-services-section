import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const tool = "/toolchain/bin";
const solc = "/toolchain/solc/solc-0.8.28";
const rpc = "http://127.0.0.1:8545";
const from = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const multicall = "0xcA11bde05977b3631167028862bE2a173976CA11";
const packageDir = "/work/consumer";
function run(program, args, options = {}) {
  const result = spawnSync(program, args, { cwd: root, encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${program} ${args.join(" ")} failed\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const anvil = spawn(`${tool}/anvil`, ["--chain-id", "8453", "--host", "127.0.0.1", "--port", "8545"], { stdio: "ignore" });
try {
  let ready = false;
  let lastError;
  for (let i = 0; i < 100; i += 1) {
    try {
      if (run(`${tool}/cast`, ["chain-id", "--rpc-url", rpc]) === "8453") { ready = true; break; }
    } catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!ready) throw new Error(`local Anvil did not become ready: ${lastError?.message}`);
  run(`${tool}/forge`, ["build", "--use", solc, "--offline", "reader-assay/ReaderFixture.sol"]);
  const assay = spawnSync(`${tool}/forge`, ["test", "--use", solc, "--offline", "-vv"], { cwd: root, encoding: "utf8", env: { HOME: "/work/home", PATH: "/toolchain/bin:/work:/usr/bin:/bin", TMPDIR: "/work/tmp" } });
  if (assay.status !== 0) throw new Error(`independent Solidity assay failed: ${assay.stderr} ${assay.stdout}`);
  const aggregate = [...assay.stdout.matchAll(/(\d+) passed; (\d+) failed; (\d+) skipped; finished in ([^\n]+)/gu)].at(-1);
  if (!aggregate) throw new Error("Foundry output lacked an aggregate test result");
  process.stdout.write(`independent-solidity-assay: ${aggregate[1]} passed, ${aggregate[2]} failed, ${aggregate[3]} skipped\n`);
  const artifact = JSON.parse(await readFile(path.join(root, "out/ReaderFixture.sol/LocalMulticall3Fixture.json"), "utf8"));
  const runtime = artifact.deployedBytecode.object.startsWith("0x") ? artifact.deployedBytecode.object : `0x${artifact.deployedBytecode.object}`;
  run(`${tool}/cast`, ["rpc", "--rpc-url", rpc, "anvil_setCode", multicall, runtime]);
  const deployment = JSON.parse(run(`${tool}/forge`, ["create", "--use", solc, "--rpc-url", rpc, "--unlocked", "--from", from, "--broadcast", "--json", "reader-assay/ReaderFixture.sol:ReaderFixture"]));
  const fixture = deployment.deployedTo;
  const latest = JSON.parse(run(`${tool}/cast`, ["block", "latest", "--json", "--rpc-url", rpc]));
  async function call(signature) {
    return run(`${tool}/cast`, ["call", fixture, signature, "--rpc-url", rpc]);
  }
  const env = {
    ...process.env,
    MARSH_ASSAY_PACKAGE_DIR: packageDir,
    MARSH_ASSAY_BOUNDARY_BLOCK_NUMBER: String(BigInt(latest.data.number)),
    MARSH_ASSAY_BOUNDARY_BLOCK_HASH: latest.data.hash,
    MARSH_ASSAY_MULTICALL_ADDRESS: multicall,
    MARSH_ASSAY_CANDIDATE_ADDRESS: await call("candidate()(address)"),
    MARSH_ASSAY_LEGACY_ADDRESS: await call("legacy()(address)"),
    MARSH_ASSAY_CANDIDATE_RESOURCE: await call("candidateResource()(bytes32)"),
    MARSH_ASSAY_LEGACY_RESOURCE: await call("legacyResource()(bytes32)"),
    MARSH_ASSAY_ABSENT_RESOURCE: await call("absentResource()(bytes32)"),
  };
  const checked = spawnSync(process.execPath, ["--experimental-loader", path.join(here, "loader.mjs"), path.join(here, "reader-check.mjs")], { cwd: root, encoding: "utf8", env });
  if (checked.status !== 0) throw new Error(`${checked.stderr}\n${checked.stdout}`);
  process.stdout.write(`${checked.stdout}fixture-only: local Anvil chain 8453; not live Base finality\n`);
} finally {
  anvil.kill("SIGTERM");
}
