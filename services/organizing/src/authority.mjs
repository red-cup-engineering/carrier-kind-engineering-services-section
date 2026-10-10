/**
 * authority - organizing's office-conferred authority read.
 *
 * This cannibalizes the office/authority half of animating-experimental's
 * dispatch algebra. Computing owns local capability-token admission; organizing
 * owns the social-scale question where an agent's capabilities are joined with
 * an office's conferred authorities and read against work/operation requirements.
 */
import { arrayTerm, jsonToTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { officeEligibilityDecisionCarrier, officeEligibilityRequestCarrier,                                } from "./schemas.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { officesHeldAtDignitas } from "@red-cup-engineering/socializing";
import { grantCapabilityView } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";

const boolFalse     = tm.bool(false);
const boolTrue     = tm.bool(true);
const isEmptyArrayTerm = (value    )     => tm.coincide(value, arrayTerm([]));
const andTerm = (left    , right    )     => tm.cond(left, right, boolFalse);

/** `member x list` for array-encoded carrier terms. */
const memberTerm     = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.var(3), tm.var(0))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

function missingFromTerm(requiredField        , providedField        )     {
  return tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.app(tm.app(memberTerm, tm.var(0)), tm.field(providedField, tm.var(2))),
        tm.var(1),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),
      ),
    )),
    arrayTerm([]),
    tm.field(requiredField, tm.var(0)),
  );
}

/** Direct reader for office-conferred eligibility. */
export function officeEligibility(request                          )                            {
  return officeEligibilityDecisionCarrier.assert(evaluateRunTerm(officeEligibilityTerm, jsonResource(request)));
}

const gapTerm = (missingCapabilities    , missingAuthorities    )     => {
  const capabilityOk = isEmptyArrayTerm(missingCapabilities);
  const authorityOk = isEmptyArrayTerm(missingAuthorities);
  return tm.cond(
    andTerm(capabilityOk, authorityOk),
    stringTerm("none"),
    tm.cond(
      capabilityOk,
      stringTerm("authority"),
      tm.cond(authorityOk, stringTerm("capability"), stringTerm("both")),
    ),
  );
};

/** Relational IR body: OfficeEligibilityRequest -> OfficeEligibilityDecision. */
export const officeEligibilityTerm     = tm.lam(
  tm.app(
    tm.app(
      tm.lam(tm.lam(objectTerm([
        ["kind", stringTerm("organizing.office-eligibility-decision")],
        ["eligible", tm.cond(andTerm(isEmptyArrayTerm(tm.var(1)), isEmptyArrayTerm(tm.var(0))), jsonToTerm(true), jsonToTerm(false))],
        ["status", tm.cond(andTerm(isEmptyArrayTerm(tm.var(1)), isEmptyArrayTerm(tm.var(0))), stringTerm("potential"), stringTerm("active"))],
        ["gap", gapTerm(tm.var(1), tm.var(0))],
        ["missingCapabilities", tm.var(1)],
        ["missingAuthorities", tm.var(0)],
      ]))),
      missingFromTerm("requiresCapabilities", "capabilities"),
    ),
    missingFromTerm("requiresAuthorities", "officeAuthorities"),
  ),
);

/** Boundary admission for the office-eligibility action. */
export function admitOfficeEligibilityRequest(input           , _verb        )                           {
  return officeEligibilityRequestCarrier.assert(input);
}

/** Issue an object capability by office: the grant is made only when the office's eligibility
 *  decision is eligible; otherwise the reading is an obstruction carrying the decision. */
export function grantByOffice(request, holder, grants, id) {
  const decision = officeEligibility(request);
  const capability = decision.eligible ? grantCapabilityView(holder, grants, id) : undefined;
  return Object.freeze({
    kind: decision.eligible ? "organizing.office-bound-grant:witness" : "organizing.office-bound-grant:obstruction",
    request,
    decision,
    holder,
    grants,
    ...(capability === undefined ? {} : { capability }),
    ok: decision.eligible,
  });
}

/** `officeEligibility` with the office authorities read off the offices `agent` holds at
 *  dignitas in admitted claim rows (recognition and induction both settled), never a caller's
 *  say-so. */
export function officeEligibilityOfIncumbent(rows, agent, request) {
  return officeEligibility({ ...request, officeAuthorities: officesHeldAtDignitas(rows, agent) });
}

/** `grantByOffice` gated by the offices `agent` actually holds at dignitas. */
export function grantByOfficeOfIncumbent(rows, agent, request, grants, id) {
  return grantByOffice({ ...request, officeAuthorities: officesHeldAtDignitas(rows, agent) }, agent, grants, id);
}
