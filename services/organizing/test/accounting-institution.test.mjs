/**
 * accounting institution - economic desk and action readings in organizing.
 */
import test from "node:test";
import assert from "node:assert/strict";

import loadLedger, { posting, transaction } from "../src/accounting/ledger.mjs";
import {
  accountingInstitutionActions,
  balanceAction,
  clearAndSettle,
  deskFromLedger,
  legacyAccountingInstitutionActions,
  minskyRegime,
  net,
} from "../src/accounting/institution.mjs";
import { gradedFromParts } from "@red-cup-engineering/exact-number-data-service/graded";

const usd = (num) => gradedFromParts(BigInt(num), 1n, "USD");

test("accounting institution reads a ledger as an organizing accounting desk", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:desk",
      date: "2026-06-26",
      narration: "desk state",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(12) }),
        posting({ account: "Income:Sales", amount: usd(-12) }),
      ],
    }),
  ]);

  const desk = deskFromLedger(ledger, "settlement desk");

  assert.equal(desk.kind, "organizing.accounting.desk");
  assert.equal(desk.identity, "settlement desk");
  assert.equal(typeof desk.cohomologyRank, "number");
});

test("accounting institution exposes generic ledger actions from organizing", () => {
  const verbs = new Set(accountingInstitutionActions.map((entry) => entry.verb));
  const legacyVerbs = new Set(legacyAccountingInstitutionActions.map((entry) => entry.verb));

  assert.equal(verbs.has("ledger-load"), true);
  assert.equal(verbs.has("balance"), true);
  assert.equal(verbs.has("federate-venues"), true);
  assert.equal(legacyVerbs.has("institute"), true);
  assert.equal(legacyVerbs.has("adjudicate"), true);
});

test("accounting institution action renders a moved balance report", () => {
  const tx = transaction({
    id: "txn:action-balance",
    date: "2026-06-26",
    narration: "action balance",
    postings: [
      posting({ account: "Assets:Cash", amount: usd(7) }),
      posting({ account: "Income:Sales", amount: usd(-7) }),
    ],
  });

  const rendered = balanceAction.execute([tx], {});

  assert.equal(typeof rendered, "string");
  assert.match(rendered, /Assets/);
  assert.match(rendered, /Income/);
});

test("economic aliases remain derived from organizing and relating", () => {
  const adjudication = clearAndSettle({ socializing: "a|p\nb|p" });
  const minsky = minskyRegime({
    kind: "settling.closureRegimeData",
    scottContinuous: false,
    finiteBase: false,
    countableCofinality: false,
  });
  const netting = net([]);

  assert.equal(adjudication.kind, "organizing.adjudication");
  assert.equal(minsky.minsky, "ponzi");
  assert.equal(netting.nettingCost, 0);
});
