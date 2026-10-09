import assert from "node:assert/strict";
import test from "node:test";

import {
  currentControls,
  validateControlRecord,
} from "../../src/enterprise/control.mjs";
import {
  enterpriseBoard,
  enterpriseBoardItem,
} from "../../src/enterprise/board.mjs";

test("control commands require authority evidence and observations require observation evidence", () => {
  assert.throws(() => validateControlRecord({
    enterprise:"enterprise:one", control:"control:1", target:"service:queue",
    type:"command", disposition:"issued", instruction:"Schedule work.",
  }), /authoritySource/u);
  assert.throws(() => validateControlRecord({
    enterprise:"enterprise:one", control:"control:1", target:"service:queue",
    type:"observation", disposition:"satisfied", observedState:{queue:"scheduled"},
  }), /observationSource/u);
});

test("control standing derives from witnessed records without executing commands", () => {
  const records=[
    {
      enterprise:"enterprise:one", control:"control:1", target:"service:queue",
      type:"command", disposition:"issued", instruction:"Schedule work.",
      authoritySource:"approval:1", recordedAt:"2026-10-03T20:00:00.000Z",
    },
    {
      enterprise:"enterprise:one", control:"control:1", target:"service:queue",
      type:"acknowledgement", disposition:"accepted", source:"worker:ack",
      recordedAt:"2026-10-03T20:00:30.000Z",
    },
    {
      enterprise:"enterprise:one", control:"control:1", target:"service:queue",
      type:"observation", disposition:"satisfied", observedState:{queue:"scheduled"},
      observationSource:"sensor:1", recordedAt:"2026-10-03T20:01:00.000Z",
    },
  ];
  const [control]=currentControls(records);
  assert.equal(control.standing,"satisfied");
  assert.equal(control.unresolvedAlarm,false);
  assert.equal("execute" in control,false);
});

test("unresolved control alarms stay visible until a sourced clear", () => {
  const fault={
    enterprise:"enterprise:one", control:"control:1", target:"service:queue",
    type:"alarm", disposition:"faulted", observedState:{queue:"stalled"},
    observationSource:"sensor:fault", recordedAt:"2026-10-03T20:02:00.000Z",
  };
  assert.equal(currentControls([fault])[0].unresolvedAlarm,true);
  const clear={
    ...fault, disposition:"cleared", observationSource:"sensor:clear",
    recordedAt:"2026-10-03T20:03:00.000Z",
  };
  assert.equal(currentControls([fault,clear])[0].unresolvedAlarm,false);
});

function reading(overrides={}) {
  return {
    plan:{openOrders:0,settingsDue:[],settingsUnjudged:[],contractsToEnter:[]},
    analyze:{statement:{valueAdjustment:[]}},
    ...overrides,
  };
}

test("enterprise board surfaces only recorded ERP CRM and ICS attention", () => {
  const enterprise={id:"enterprise:one",name:"One"};
  const contacts=[{party:"party:a",callbackAt:"2026-10-03T19:00:00.000Z",recordedAt:"2026-10-02T18:00:00.000Z"}];
  const orders=[{
    order:"order:1",party:"party:a",stage:"interested",recordedAt:"2026-10-03T18:00:00.000Z",
    history:[{event:"quote",recordedAt:"2026-10-03T18:00:00.000Z"}],
  }];
  const controls=[{control:"control:1",target:"service:queue",standing:"faulted",unresolvedAlarm:true}];
  const item=enterpriseBoardItem({
    enterprise,
    reading:reading({
      plan:{openOrders:1,settingsDue:["price"],settingsUnjudged:[],contractsToEnter:[]},
      analyze:{statement:{valueAdjustment:[{measures:[{reading:"short"}]}]}},
    }),
    contacts,orders,controls,now:"2026-10-03T21:00:00.000Z",
  });
  assert.deepEqual(item.attention,[
    "callback-due",
    "control-fault",
    "measure-short",
    "open-order",
    "quote-unanswered",
    "setting-due",
  ]);
});

test("quiet enterprise stays quiet and board sorts attention first", () => {
  const quiet={
    enterprise:{id:"enterprise:quiet",name:"Quiet"},
    reading:reading(), contacts:[], orders:[], controls:[],
  };
  const faulted={
    enterprise:{id:"enterprise:faulted",name:"Faulted"},
    reading:reading(), contacts:[], orders:[],
    controls:[{control:"c",target:"x",standing:"faulted",unresolvedAlarm:true}],
  };
  const board=enterpriseBoard([quiet,faulted],{now:"2026-10-03T21:00:00.000Z"});
  assert.equal(board.counts.enterprises,2);
  assert.equal(board.counts.attention,1);
  assert.equal(board.counts.controlFaults,1);
  assert.equal(board.enterprises[0].enterprise,"enterprise:faulted");
  assert.deepEqual(board.enterprises[1].attention,[]);
});
