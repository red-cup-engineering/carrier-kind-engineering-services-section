/**
 * Game position — the agent's work as a real concurrent-game position, not a
 * scoreboard.
 *
 * The Caillois/flow scoreboard (operation-ledger-game) scores points; this drives
 * lib/gaming's actual CGS carriers. The open read-work is an **arena**: a prime
 * event structure of Opponent (negative-polarity) events, each an obstacle the
 * empty play can extend into — so `challengeOf` reads the breadth of the
 * situation the agent must meet. The agent's distinct operation moves are a
 * **strategy** on that arena, whose `skillOf` is its repertoire breadth. `flow`
 * then judges the Csikszentmihalyi balance exactly: skill short of challenge is
 * anxiety, skill beyond it is boredom, commensurate is flow. The position is a
 * genuine read of the play, computed by the gaming package, not a tally.
 */
import { arena, challengeOf, event, eventStructure, flow, negative, play, skillOf, strategy } from "@red-cup-engineering/gaming";

import { operationsLedger, type OperationLedgerEntry } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { operationsManifoldWork } from "./work-management.mts";
import { optionalText } from "./records.mts";

export type GamePositionFlow = "flow" | "anxiety" | "boredom";

export type GamePosition = Readonly<{
  kind: "operations-manifold.game-position";
  generatedAt: string;
  session: string | null;
  challenge: number;
  skill: number;
  flow: GamePositionFlow;
  gap: number;
  openings: readonly string[];
  repertoire: readonly string[];
  reading: string;
}>;

export type GamePositionParams = Readonly<{ session?: string | undefined; session_id?: string | undefined }>;

export async function gamePosition(repoRoot: string, params: GamePositionParams = {}): Promise<GamePosition> {
  const session = optionalText(params.session ?? params.session_id);
  const [work, ledger] = await Promise.all([operationsManifoldWork(repoRoot), operationsLedger(repoRoot)]);

  const open = work.items.filter((item) => item.status !== "complete");
  const events = open.map((item) => event(`work:${item.id}`, negative()));
  const board = arena(eventStructure(events));

  const operations = session === null ? ledger.entries : ledger.entries.filter((entry) => boundToSession(entry, session));
  const moves = [...new Set(operations.map((entry) => entry.event))];
  const repertoire = strategy(board, [play(moves)]);

  const challenge = challengeOf(board);
  const skill = skillOf(repertoire);
  const judgment = flow(board, repertoire);
  const flowName: GamePositionFlow = judgment.kind === "game-analysis.flow:witness" ? "flow" : judgment.reason;
  const gap = challenge.value - skill.value;

  return Object.freeze({
    kind: "operations-manifold.game-position" as const,
    generatedAt: new Date().toISOString(),
    session,
    challenge: challenge.value,
    skill: skill.value,
    flow: flowName,
    gap,
    openings: Object.freeze(challenge.openings.slice(0, 12)),
    repertoire: Object.freeze(skill.repertoire),
    reading: readingFor(flowName, gap),
  });
}

function boundToSession(entry: OperationLedgerEntry, session: string): boolean {
  return entry.trace.includes(session) || entry.subject.includes(session) || entry.evidence.some((value) => value.includes(session));
}

function readingFor(flowName: GamePositionFlow, gap: number): string {
  if (flowName === "anxiety") return `anxiety: ${gap} more open fronts than distinct move-kinds — narrow the board (complete or defer work) or widen the repertoire`;
  if (flowName === "boredom") return `boredom: repertoire exceeds the open board by ${Math.abs(gap)} — take on more challenge or a harder front`;
  return "flow: challenge and skill are commensurate — the play is in the channel";
}
