/**
 * engine — converse with a character as a specific user, fusing that user's
 * discrete memory with the character's domain context.
 *
 * Each (character, user) pair gets its OWN namespace on the data mount, so a
 * character's memory of one person never bleeds into its memory of another —
 * "discrete memory about that user". Before a turn runs, we recall what that
 * namespace has durably learned (recallMemory) and fuse it into the character's
 * standing domain prompt. Then the upstream pulse runs the turn: chat → log →
 * derive → judge → (inward + aperiodic) dream — so the very act of talking keeps
 * the memory growing, with no ticking service.
 *
 * The HTTP layer is stateless: a client re-sends the running dialogue each call.
 * We pass the prior turns to the model for local coherence, but only the new
 * user turn and its reply are logged — the cross-conversation continuity comes
 * from the recalled memory, not from re-logging history.
 */

import crypto from "node:crypto";

import { pulse, recallMemory, type PulseConfig, type PulseResult } from "@red-cup-engineering/organizing-with-openai-agents";
import { user, assistant, type ChatMessage } from "@red-cup-engineering/organizing-with-llm-agents/algebra";

import type { Character } from "./characters.mts";

/** An OpenAI chat message as it arrives on the wire. */
export interface OpenAiMessage {
  readonly role: string;
  readonly content: string;
}

/** Inputs to a single turn. */
export interface ConverseParts {
  readonly character: Character;
  /** The authenticated user's email — the identity memory is keyed by. */
  readonly userEmail: string;
  /** The running dialogue from the client (OpenAI message array). */
  readonly messages: readonly OpenAiMessage[];
  /** Data mount root; defaults to the pulse default (<cwd>/data). */
  readonly dataRoot?: string;
}

/** The settled outcome of a turn. */
export interface ConverseResult {
  readonly reply: string;
  readonly result: PulseResult;
  readonly namespace: string;
}

/** A filesystem-safe identity for a user (the mount namespace is part of a
 *  filename, so the raw email cannot be used directly). */
export function userKey(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

/** The discrete memory namespace for a (character, user) pair. */
export function memoryNamespace(characterId: string, email: string): string {
  return `char-${characterId}-${userKey(email)}`;
}

/** Fuse a character's domain context with the user's recalled memory into the
 *  standing system prompt for a turn. */
export function fuseSystemPrompt(character: Character, memorySummary: string): string {
  if (memorySummary.trim().length === 0) return character.domain;
  return `${character.domain}\n\n${memorySummary}`;
}

/** Run one turn: recall memory, fuse, pulse, return the reply and standing. */
export async function converse(parts: ConverseParts): Promise<ConverseResult> {
  const { character, userEmail, messages } = parts;
  const namespace = memoryNamespace(character.id, userEmail);
  const session = userKey(userEmail);

  const memory = await recallMemory({
    namespace,
    ...(parts.dataRoot === undefined ? {} : { root: parts.dataRoot }),
  });
  const system = fuseSystemPrompt(character, memory.summary);

  const { prompt, history } = splitDialogue(messages);
  if (prompt === undefined) throw new Error("converse: no user message to respond to");

  const config: PulseConfig = {
    session,
    namespace,
    system,
    ...(parts.dataRoot === undefined ? {} : { root: parts.dataRoot }),
    ...(character.chatEndpoint === undefined ? {} : { chatEndpoint: character.chatEndpoint }),
    ...(character.dreamEndpoint === undefined ? {} : { dreamEndpoint: character.dreamEndpoint }),
    ...(character.model === undefined ? {} : { model: character.model }),
    ...(character.dreamModel === undefined ? {} : { dreamModel: character.dreamModel }),
    ...(character.dreamEvery === undefined ? {} : { dreamEvery: character.dreamEvery }),
  };

  const result = await pulse(config, prompt, history);
  return { reply: result.reply, result, namespace };
}

/** Split the wire dialogue into the new user turn (the last user message) and
 *  the prior user/assistant turns. Client-supplied system messages are dropped:
 *  the character's domain is the authoritative system context. */
function splitDialogue(messages: readonly OpenAiMessage[]): { prompt: string | undefined; history: ChatMessage[] } {
  const turns = messages.filter((m) => m.role === "user" || m.role === "assistant");
  let lastUser = -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]!.role === "user") { lastUser = i; break; }
  }
  if (lastUser === -1) return { prompt: undefined, history: [] };
  const history = turns.slice(0, lastUser).map((m) => (m.role === "user" ? user(m.content) : assistant(m.content)));
  return { prompt: turns[lastUser]!.content, history };
}
