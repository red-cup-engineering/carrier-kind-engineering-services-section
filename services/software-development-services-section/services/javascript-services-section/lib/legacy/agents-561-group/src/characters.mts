/**
 * characters — the roster a user picks from, and the data behind each.
 *
 * A character is the unit a user talks WITH: a named voice with a domain (its
 * standing system prompt — expertise and manner) and the endpoint/model that
 * inference runs against. It is deliberately data, not code: the built-in roster
 * below is the default, and a deployment may override or extend it with a
 * `characters.config.json` at the site root (an array of these objects).
 *
 * A character is NOT the memory. Memory is discrete per (character, user) and
 * lives on the data mount (see engine.mts); the character only supplies the
 * domain context that memory is fused INTO each turn.
 */

import { readFile } from "node:fs/promises";
import type { EndpointRef } from "@emsenn/organizing-with-openai-agents";

/** One character on the roster. */
export interface Character {
  /** Stable id — this is the OpenAI "model" id and the MCP path segment. */
  readonly id: string;
  /** Display name shown to users. */
  readonly name: string;
  /** One-line description for the roster and model metadata. */
  readonly description: string;
  /** The character's domain context: its standing system prompt — who it is,
   *  what it knows, how it speaks. Fused with per-user memory each turn. */
  readonly domain: string;
  /** Chat endpoint ref; defaults to the first available cloud (NVIDIA, then Groq). */
  readonly chatEndpoint?: EndpointRef;
  /** Dream endpoint ref for between-turn consolidation; defaults to chat. */
  readonly dreamEndpoint?: EndpointRef;
  /** Chat model; defaults to the endpoint's default model. */
  readonly model?: string;
  /** Dream model; defaults to the dream endpoint's default model. */
  readonly dreamModel?: string;
  /** Dream cadence in assistant turns (default 3). */
  readonly dreamEvery?: number;
}

/** The built-in roster, used when no `characters.config.json` is present. Each
 *  domain is a real standing prompt; a deployment tunes these to its voices. */
export const DEFAULT_CHARACTERS: readonly Character[] = Object.freeze([
  {
    id: "hai-rui",
    name: "Hai-Rui",
    description: "A patient systems thinker for untangling gnarly technical and organizational problems.",
    domain:
      "You are Hai-Rui, a patient, precise systems thinker. You help people untangle " +
      "gnarly technical and organizational problems by finding the load-bearing " +
      "structure, naming the real constraint, and proposing the smallest change that " +
      "moves it. You favour concrete examples over abstraction and admit uncertainty " +
      "plainly. You remember what each person is building and meet them where they are.",
  },
  {
    id: "cassia-lorne",
    name: "Cassia Lorne",
    description: "An essayist and editor for finding the shape of an argument and the line that carries it.",
    domain:
      "You are Cassia Lorne, an essayist and editor with a sharp ear for the shape of " +
      "an argument. You help people find what they are actually trying to say, cut what " +
      "doesn't carry weight, and keep the line that does. You are warm but unsentimental " +
      "about prose. You remember each writer's voice and the work they are circling.",
  },
  {
    id: "farstone",
    name: "Farstone",
    description: "A strategist for long games — markets, careers, and decisions under deep uncertainty.",
    domain:
      "You are Farstone, a strategist for long games. You help people reason about " +
      "decisions under deep uncertainty — markets, careers, big commitments — by " +
      "separating what is knowable from what is not, sizing bets to survivable losses, " +
      "and respecting path-dependence. You never give false confidence. You remember " +
      "each person's situation, risk appetite, and the bets they have already placed.",
  },
]);

/** Load the roster: `characters.config.json` at `siteRoot` if present (an array
 *  of Character), else the built-in default. */
export async function loadCharacters(siteRoot: string): Promise<readonly Character[]> {
  try {
    const raw = await readFile(`${siteRoot}/characters.config.json`, "utf-8");
    const parsed = JSON.parse(raw);
    const list = (Array.isArray(parsed) ? parsed : parsed?.characters) as unknown;
    if (Array.isArray(list) && list.every(isCharacter)) return Object.freeze(list);
    throw new Error("characters.config.json is not an array of {id,name,description,domain}");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CHARACTERS;
    throw error;
  }
}

function isCharacter(value: unknown): value is Character {
  if (value === null || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return typeof r["id"] === "string"
    && typeof r["name"] === "string"
    && typeof r["description"] === "string"
    && typeof r["domain"] === "string";
}

/** Index a roster by id for O(1) resolution. */
export function rosterIndex(characters: readonly Character[]): ReadonlyMap<string, Character> {
  return new Map(characters.map((c) => [c.id, c]));
}
