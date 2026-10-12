import { generateImageWithReceipt } from "@red-cup-engineering/computer-inference-engine/media/zero-cash-generation";
import { imageProviders } from "@red-cup-engineering/google-flow-services-section/flow-generate";
import { addressedRecord } from "./records.mjs";

export const PROVIDER_INVENTORY = Object.freeze([
  { provider: "google-flow", models: ["GEM_PIX_2"], capability: "image-generation", admission: "executable", reachability: "requires-real-invocation", transport: "flow-order-under-the-account-google-ai-plan" },
  { provider: "cloudflare-workers-ai", models: ["@cf/black-forest-labs/flux-1-schnell"], capability: "image-generation", admission: "executable", reachability: "requires-real-invocation", transport: "deployed-worker-then-account-api" },
  { provider: "gemini", models: ["gemini-*-image", "imagen-*", "nano-banana*"], capability: "image-generation", admission: "catalog-discoverable-pattern-not-currently-admitted-model", reachability: "configured-only-until-adapter-catalog-observation-and-invocation", transport: null },
  { provider: "nvidia-nim", models: [], capability: "image-generation", admission: "catalog-discoverable-if-provider-reports-capability", reachability: "configured-only-no-image-adapter", transport: null },
  { provider: "openrouter", models: ["provider-reported-*:free only"], capability: "image-generation", admission: "catalog-discoverable", reachability: "configured-only-no-image-adapter", transport: null },
  { provider: "zhipu", models: ["GLM-4.6V-Flash"], capability: "vision-judge", admission: "catalog-note-only", reachability: "unkeyed-unverified", transport: null },
]);

export const VISION_JUDGE_INVENTORY = Object.freeze([
  { provider: "nvidia-nim", model: "meta/llama-3.2-11b-vision-instruct", family: "llama-vision", admission: "zero-cash direct-endpoint provider", reachability: "configured-only-no-image-input-adapter" },
  { provider: "gemini", model: null, family: "gemini", admission: "provider-catalog-observation-required", reachability: "configured-only-no-vision-adapter" },
  { provider: "cloudflare-workers-ai", family: "provider-observed-multimodal-model", admission: "provider-catalog-observation-required", reachability: "configured-only-no-vision-adapter" },
  { provider: "openrouter", family: "provider-reported-free-multimodal-family", admission: "provider-catalog-observation-required", reachability: "configured-only-no-vision-adapter" },
  { provider: "zhipu", family: "glm-v", admission: "catalog-note-only", reachability: "unkeyed-unverified" },
]);

export function providerInventoryRecord(observedAt, probe = null) {
  return addressedRecord("CoverLabProviderInventory", 1, { observedAt, generators: PROVIDER_INVENTORY, judges: VISION_JUDGE_INVENTORY, probe, rule: "configured, catalog-observed, and invocation-reachable are distinct states" });
}

/** A cover background, best first: a free 9:16 Flow image (cropped to KDP's 10:16 by the edition cover), else Workers AI. */
export const coverBackground = (prompt) => generateImageWithReceipt(prompt, { providers: imageProviders({ consumer: "kindle-covers", aspect: "9:16" }) });

export async function generateCoverBackground(candidate, { generate = coverBackground, now = () => new Date().toISOString() } = {}) {
  const startedAt = now();
  const result = await generate(`${candidate.prompt} Seed ${candidate.seed}.`);
  const generatedAt = now();
  const receipt = result.receipt ?? null;
  return Object.freeze({
    buffer: result.bytes ?? result.buffer,
    evidence: addressedRecord("CoverGenerationReceipt", 1, {
      candidate: candidate.id, family: candidate.family, provider: receipt?.provider ?? result.provider, model: receipt?.model ?? result.model,
      prompt: candidate.prompt, seed: candidate.seed, requestedAt: startedAt, generatedAt,
      cost: { currency: receipt?.consideration?.unit ?? "USD", amount: Number(receipt?.consideration?.cash ?? 0), basis: receipt ? "house ZeroCashMediaInferenceReceipt" : "injected provider observation" },
      provenance: { upstreamReceipt: receipt?.id ?? null, output: receipt?.output ?? null },
    }),
  });
}
