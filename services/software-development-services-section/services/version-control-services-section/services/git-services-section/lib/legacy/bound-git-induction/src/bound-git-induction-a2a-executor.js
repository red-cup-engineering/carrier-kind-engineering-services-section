#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  agentRmnMessage,
  extractRmnPart,
  parseA2aMessage,
} from "@red-cup-engineering/a2a-rmn-part-service";
import { handleProductionPublicCarrier } from "./bound-git-induction-service.js";

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required for activated bound-Git ingress`);
  }
  return value;
}

function jsonFile(environment, name) {
  return JSON.parse(readFileSync(resolve(required(environment, name)), "utf8"));
}

async function runtimeFunctions(environment) {
  const url = required(environment, "BOUND_GIT_RUNTIME_MODULE");
  const module = await import(url.startsWith("file:") ? url : `file://${resolve(url)}`);
  for (const name of ["loadReceipt", "bindingReceipt", "loadPrepareChain"]) {
    if (typeof module[name] !== "function") {
      throw new Error(`activated runtime module must export ${name}`);
    }
  }
  return module;
}

export async function executeBoundGitA2aMessage(source, {
  environment = process.env,
  handle = handleProductionPublicCarrier,
} = {}) {
  const message = parseA2aMessage(
    typeof source === "string" || Buffer.isBuffer(source)
      ? JSON.parse(Buffer.from(source).toString("utf8"))
      : source,
  );
  const { bytes } = extractRmnPart(message.parts);
  const authorization = message.metadata?.boundGitAuthorization;
  if (!authorization) throw new Error("bound-Git customer authorization is required");
  const runtime = await runtimeFunctions(environment);
  const signed = await handle(bytes, {
    authorization,
    routesFile: required(environment, "BOUND_GIT_ROUTES"),
    providerAccount: required(environment, "BOUND_GIT_PROVIDER_ACCOUNT"),
    rpcUrl: required(environment, "BOUND_GIT_RPC_URL"),
    nonceRoot: required(environment, "BOUND_GIT_NONCE_ROOT"),
    coordinatorIdentity: jsonFile(environment, "BOUND_GIT_COORDINATOR_IDENTITY"),
    coordinatorAgentUrl: required(environment, "BOUND_GIT_COORDINATOR_AGENT"),
    receiverAgentUrl: required(environment, "BOUND_GIT_RECEIVER_AGENT"),
    objectFormat: required(environment, "BOUND_GIT_OBJECT_FORMAT"),
    binding: jsonFile(environment, "BOUND_GIT_BINDING"),
    privateKeyPem: readFileSync(
      resolve(required(environment, "BOUND_GIT_SIGNING_KEY")),
      "utf8",
    ),
    signingKid: required(environment, "BOUND_GIT_SIGNING_KID"),
    signingJwks: required(environment, "BOUND_GIT_SIGNING_JWKS"),
    loadReceipt: runtime.loadReceipt,
    bindingReceipt: runtime.bindingReceipt,
    loadPrepareChain: runtime.loadPrepareChain,
    readPrepareProof: runtime.readPrepareProof,
  });
  const response = agentRmnMessage(signed.bytes);
  response.metadata = { ...response.metadata, jws: signed.jws };
  return response;
}

async function readStandardInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(
    `${JSON.stringify(await executeBoundGitA2aMessage(await readStandardInput()))}\n`,
  );
}
