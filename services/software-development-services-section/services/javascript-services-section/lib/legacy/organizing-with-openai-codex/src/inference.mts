// Codex-specific inference: OpenAI endpoint + holography wrapper.
// The only place keys and sockets enter this package; everything else is pure.
import {
  openaiAgentInfer,
  type HolographyOptions,
  type OpenaiAgentInfer,
} from "@red-cup-engineering/organizing-with-openai-agents/inference";

export type { HolographyOptions };

/** An inference function scoped to the OpenAI endpoint: receives a request
 *  without an endpoint field and resolves it. */
export type CodexInfer = OpenaiAgentInfer;

/** Build a CodexInfer bound to the OpenAI endpoint. The API key is resolved by
 *  holography at call time (OPENAI_API_KEY); it never enters this closure. */
export function codexInfer(options: HolographyOptions = {}): CodexInfer {
  return openaiAgentInfer("openai", options);
}
