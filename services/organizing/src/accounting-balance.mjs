/**
 * accounting-balance - exact conservation read for accounting transactions.
 *
 * The record-state projection lives in `accounting.mts`; this module is the
 * arithmetic read. It reuses relating's generic graded conservation law and only
 * supplies the accounting adapter: amounts are exact bigint rationals graded by
 * commodity, with JSON-safe decimal integer strings at the organizing boundary.
 */
import { gradedComplete, gradedConserved } from "@red-cup-engineering/exact-number-data-service/graded";

import {
  postingWeight,

} from "./accounting/ledger.mjs";
import { gradedFromParts, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";

/** Read whether a transaction conserves in every commodity and infer one elided leg if possible. */
export function accountingBalance(entry                 )                    {
  if (!isTransaction(entry)) {
    throw new TypeError("accountingBalance: expected an accounting transaction");
  }
  const postings = entry.postings.map(postingIn);
  const unresolvedPostingIndices = postings
    .map((posting, index) => posting.cost !== null && posting.cost.amount === null ? index : -1)
    .filter((index) => index >= 0);
  const weights = postings.flatMap((posting) => {
    const weight = postingWeight(posting);
    return weight === null ? [] : [weight];
  });
  const residual = residualOf(gradedConserved(weights));
  const elided = elidedPostingIndex(entry.postings);
  const completion = elided === null
    ? null
    : gradedComplete(
        postings
          .filter((_posting, index) => index !== elided)
          .flatMap((posting) => {
            const weight = postingWeight(posting);
            return weight === null ? [] : [weight];
          }),
      );
  const inferred = completion?.kind === "meme-analysis.conservation.graded-completion:witness" ? completion.inferred : null;
  return Object.freeze({
    kind: "organizing.accounting.balance"         ,
    balanced: residual.length === 0 && unresolvedPostingIndices.length === 0,
    residual: Object.freeze(residual.map(amountOut)),
    residualExact: Object.freeze(residual.map(exactString)),
    inferredPostingIndex: inferred === null ? null : elided,
    inferredAmount: inferred === null ? null : amountOut(inferred),
    unresolvedPostingIndices: Object.freeze(unresolvedPostingIndices),
  })                     ;
}

export function admitAccountingTransaction(input                 , verb        )              {
  if (!isTransaction(input)) throw new TypeError(`${verb}: expected an accounting transaction`);
  return input;
}

function postingIn(posting         )                {
  return Object.freeze({
    account: posting.account,
    amount: posting.amount === null ? null : amountIn(posting.amount),
    cost: posting.cost === null ? null : Object.freeze({
      ...posting.cost,
      amount: posting.cost.amount === null ? null : amountIn(posting.cost.amount),
    }),
    price: posting.price === null ? null : Object.freeze({
      kind: posting.price.kind,
      amount: amountIn(posting.price.amount),
    }),
    balanceAssertion: posting.balanceAssertion === null ? null : Object.freeze({
      ...posting.balanceAssertion,
      amount: amountIn(posting.balanceAssertion.amount),
    }),
    meta: posting.meta,
  });
}

function elidedPostingIndex(postings                    )                {
  const indices           = [];
  postings.forEach((posting, index) => {
    if (posting.amount === null) indices.push(index);
  });
  return indices.length === 1 ? indices[0]  : null;
}

function amountIn(value        )             {
  return gradedFromParts(integer(value.num, "amount.num"), integer(value.den, "amount.den"), value.commodity);
}

function amountOut(value            )         {
  const exact = gradedToExactString(value);
  const match = /^(-?[0-9]+)\/([0-9]+)\s+(.+)$/.exec(exact);
  if (match === null) throw new TypeError(`accounting amount: malformed exact value ${JSON.stringify(exact)}`);
  return Object.freeze({ num: match[1] , den: match[2] , commodity: match[3]  });
}

function exactString(value            )         {
  return gradedToExactString(value);
}

function residualOf(judgment                                    )                        {
  return "residual" in judgment ? judgment.residual : [];
}

function integer(value        , label        )         {
  if (!/^-?[0-9]+$/.test(value)) throw new TypeError(`accountingBalance: ${label} must be a decimal integer string`);
  return BigInt(value);
}

function isTransaction(entry                 )                       {
  return typeof entry === "object" && entry !== null && "postings" in entry && Array.isArray(entry.postings);
}
