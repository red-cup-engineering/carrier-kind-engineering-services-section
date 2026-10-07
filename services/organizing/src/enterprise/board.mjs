/** Attention-oriented board over one enterprise's existing records. */
function last(records) {
  return [...records].sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt))).at(-1);
}

function unansweredQuote(order) {
  const quote=[...order.history].filter((r)=>r.event==="quote").sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt))).at(-1);
  if (!quote) return false;
  const answer=[...order.history].filter((r)=>r.event==="quote-answer").sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt))).at(-1);
  return !answer || String(answer.recordedAt) < String(quote.recordedAt);
}

export function enterpriseBoardItem({ enterprise, reading, contacts=[], orders=[], controls=[], now=new Date().toISOString() }) {
  const reasons=new Set();
  const dueCallbacks=contacts.filter((contact)=>contact.callbackAt && String(contact.callbackAt) <= now);
  const unansweredQuotes=orders.filter(unansweredQuote);
  const controlFaults=controls.filter((control)=>control.unresolvedAlarm || control.standing==="faulted" || control.standing==="deviated");

  if (dueCallbacks.length) reasons.add("callback-due");
  if (unansweredQuotes.length) reasons.add("quote-unanswered");
  if (reading.plan.openOrders > 0) reasons.add("open-order");
  if (reading.plan.settingsDue.length) reasons.add("setting-due");
  if (reading.plan.settingsUnjudged.length) reasons.add("setting-unjudged");
  if (reading.plan.contractsToEnter.length) reasons.add("contract-entry");
  if (reading.analyze.statement.valueAdjustment.some((adjustment)=>
    adjustment.measures.some((measure)=>measure.reading==="short"))) reasons.add("measure-short");
  if (controlFaults.length) reasons.add("control-fault");

  const latestContact=last(contacts);
  const latestOrderEvent=last(orders.flatMap((order)=>order.history));
  return Object.freeze({
    kind:"enterprise.erp-ics-crm-board-item",
    enterprise:enterprise.id,
    name:enterprise.name,
    attention:Object.freeze([...reasons].sort()),
    dueCallbacks:Object.freeze(dueCallbacks),
    unansweredQuotes:Object.freeze(unansweredQuotes.map(({order,party,stage,recordedAt})=>({order,party,stage,recordedAt}))),
    controlFaults:Object.freeze(controlFaults.map(({control,target,standing,unresolvedAlarm})=>({control,target,standing,unresolvedAlarm}))),
    latestContact:latestContact ?? null,
    latestOrderEvent:latestOrderEvent ?? null,
    openOrders:reading.plan.openOrders,
    settingsDue:reading.plan.settingsDue,
    settingsUnjudged:reading.plan.settingsUnjudged,
    contractsToEnter:reading.plan.contractsToEnter,
    statement:reading.analyze.statement,
  });
}

export function enterpriseBoard(items, { now=new Date().toISOString() }={}) {
  const rows=items.map((input)=>enterpriseBoardItem({...input,now}))
    .sort((a,b)=>b.attention.length-a.attention.length || a.enterprise.localeCompare(b.enterprise));
  return Object.freeze({
    kind:"enterprise.erp-ics-crm-board",
    asOf:now,
    counts:Object.freeze({
      enterprises:rows.length,
      attention:rows.filter((row)=>row.attention.length>0).length,
      callbacksDue:rows.reduce((sum,row)=>sum+row.dueCallbacks.length,0),
      unansweredQuotes:rows.reduce((sum,row)=>sum+row.unansweredQuotes.length,0),
      controlFaults:rows.reduce((sum,row)=>sum+row.controlFaults.length,0),
    }),
    enterprises:Object.freeze(rows),
  });
}
