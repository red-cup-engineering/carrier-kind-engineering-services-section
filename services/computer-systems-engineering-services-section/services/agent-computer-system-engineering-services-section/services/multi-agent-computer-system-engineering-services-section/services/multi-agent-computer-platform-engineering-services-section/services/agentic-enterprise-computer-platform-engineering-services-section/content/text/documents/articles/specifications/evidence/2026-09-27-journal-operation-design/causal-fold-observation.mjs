import vm from 'node:vm';
const functionSource="function scanCausalEvents(\n  events,\n  initial,\n  fold,\n) {\n  let result = initial;\n  let rows = 0;\n  let malformed = 0;\n  for (const event of topologicalOrder(causalGraphOf(events))) {\n    if (!Array.isArray(event.observation.payload)) {\n      malformed += 1;\n      continue;\n    }\n    try {\n      result = fold(result, toEavt(eavtRecord(event.observation.payload)), event);\n      rows += 1;\n    } catch {\n      malformed += 1;\n    }\n  }\n  return Object.freeze({ result, rows, malformed });\n}\n";
const scan=vm.runInNewContext('('+functionSource+')',{topologicalOrder:x=>x,causalGraphOf:x=>x,eavtRecord:x=>x,toEavt:x=>x});
const original=new Error('fixture application callback failure');
let caught=false,result;
try{result=scan([{observation:{payload:['e','a','v','t']}}],{applied:0},()=>{throw original})}catch(error){caught=error===original}
console.log(JSON.stringify({method:'Exact current scanCausalEvents function with controlled row/causal primitives; isolated fixture',callbackFailurePropagated:caught,result,limits:['Local catch-scope observation only; no production journal or caller executed.']}));
