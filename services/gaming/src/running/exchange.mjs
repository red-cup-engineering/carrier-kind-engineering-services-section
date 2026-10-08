import { coincides } from "@red-cup-engineering/signcell/cell";
import {
  fromInt,
  intAdd,
  intCompare,
  intSubtract,
  toInt,
} from "@red-cup-engineering/exact-number-data-service/exact-number";

const required = ["item", "owner", "from", "to", "payer", "payee"];
const present = (value) => value !== undefined && value !== null;
const isNonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

/**
 * Compute one conserved physical exchange from a captured world snapshot.
 * The item identity is retained and its owner changes once; the payer's exact
 * integer balance is debited by the price and the payee's is credited equally.
 * This returns semantic effects for the caller to express in its own carrier.
 */
export function conservedExchange(input = {}) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("conservedExchange: input must be a record");
  }
  const { item, owner, from, to, payer, payee, price, payerBalance, payeeBalance } = input;
  for (const name of required) {
    if (!present(input[name])) throw new TypeError(`conservedExchange: ${name} is required`);
  }
  if (!coincides(owner, from)) throw new RangeError("conservedExchange: item is not owned by the transfer source");
  const payment = conservedTransfer({ payer, payee, price, payerBalance, payeeBalance });
  return Object.freeze({ item: Object.freeze({ item, owner: to }), ...payment });
}

/** Transfer an exact amount without manufacturing an item exchange. */
export function conservedTransfer({ payer, payee, price, payerBalance, payeeBalance }) {
  if (!present(payer) || !present(payee)) throw new TypeError("payment requires payer and payee");
  if (coincides(payer, payee)) throw new RangeError("conservedExchange: payer and payee must differ");
  if (!isNonnegativeInteger(price)) throw new RangeError("conservedExchange: price must be a nonnegative safe integer");
  if (!isNonnegativeInteger(payerBalance)) throw new RangeError("conservedExchange: payer balance must be a nonnegative safe integer");
  if (!isNonnegativeInteger(payeeBalance)) throw new RangeError("conservedExchange: payee balance must be a nonnegative safe integer");

  const exactPrice = fromInt(price);
  const exactPayer = fromInt(payerBalance);
  const exactPayee = fromInt(payeeBalance);
  const exactDebit = intSubtract(exactPayer, exactPrice);
  if (intCompare(exactDebit, fromInt(0)) < 0) {
    throw new RangeError("conservedExchange: insufficient funds");
  }

  const credit = toInt(intAdd(exactPayee, exactPrice));
  if (!Number.isSafeInteger(credit)) throw new RangeError("payment exceeds safe balance range");
  return Object.freeze({
    balances: Object.freeze([
      Object.freeze({ actor: payer, balance: toInt(exactDebit) }),
      Object.freeze({ actor: payee, balance: credit }),
    ]),
    amount: price,
  });
}
