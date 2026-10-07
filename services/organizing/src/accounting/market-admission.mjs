/**
 * organizing/accounting/market-admission — admit an economic order book through
 * gaming's market arena.
 *
 * This is the organizing-owned remnant of the retired `@emsenn/trading` root:
 * an accounting market token is not admitted as free data. Its order book is
 * first read as a gaming concurrent-game arena, then admitted through the
 * `@red-cup-engineering/gaming` root.
 */
import { gaming } from "@red-cup-engineering/gaming";
import { marketArena } from "@red-cup-engineering/gaming/market";

export function admitAccountingMarket(
  token,
  claim = {},
) {
  const arena = marketArena(token.book);
  const game = gaming(
    "create",
    { id: token.id, arena },
    claim.id === undefined ? {} : { id: claim.id },
  );
  return Object.freeze({
    action: "accounting.market.admit",
    admitted: game.admitted,
    ...(game.admitted
      ? {
          carrier: Object.freeze({
            kind: "organizing.accounting.market.carrier",
            game,
            book: token.book,
          }),
        }
      : {}),
    game,
  });
}

export function trade(
  action,
  token,
  claim,
) {
  if (action !== "accounting.market.admit") {
    throw new TypeError(`accounting market trade: unsupported action ${JSON.stringify(action)}`);
  }
  return admitAccountingMarket(token, claim);
}
