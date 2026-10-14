/**
 * Bounded finite-graph compute-capacity forecast.
 *
 * Science dependencies (NOT a proof that this planner is optimal):
 * Obsmetrologia/Language/Positing/Gauge.lean proves the Klein-four group;
 * Obsmetrologia/Cohomology/CoordinationCohomology.lean treats cycle rank as
 * coordination cost. The R^2 signed representation here is an explicit
 * representation of abstract K4, NOT its native action on FOUR claims.
 *
 * A gauge mismatch blocks projected cross-office transfer, never repairs
 * missing authority. The physical flow does not use sign-flipped capacity:
 * only evidenced nonnegative service headroom may process a work unit.
 * Simulations do not move work or authorize the tenant's cloud spending.
 */
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const GAUGES = Object.freeze({ id: 0, neg: 1, conf: 2, negConf: 3 });
const finite = (x, name) => {
  if (typeof x !== "number" || !Number.isFinite(x) || x < 0)
    throw new TypeError(`${name} must be a nonnegative finite measurement`);
  return x;
};
const whole = (x,name,max=1_000_000) => {
  if (!Number.isSafeInteger(x) || x < 0 || x > max) throw new TypeError(`${name} must be a bounded nonnegative integer`);
  return x;
};
const nameOf = (x,name) => {
  if (typeof x !== "string" || !/^[a-z][a-z0-9.-]{0,127}$/u.test(x))
    throw new TypeError(`${name} must be a lowercase resource identifier`);
  return x;
};
const clock = value => {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/u.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,19) !== value.slice(0,19))
    throw new TypeError("asOf must be a real UTC timestamp");
  return Date.parse(value);
};
/** K4=Z2xZ2: composition is XOR and every element is self-inverse. */
export function kleinCompose(a,b) {
  if (!Object.hasOwn(GAUGES,a) || !Object.hasOwn(GAUGES,b)) throw new TypeError("unsupported K4 gauge");
  return Object.keys(GAUGES).find(key => GAUGES[key] === (GAUGES[a] ^ GAUGES[b]));
}
/** Faithful orthogonal sign representation; never interprets signed numbers as resource grants. */
export function kleinTransport(g,vector) {
  if (!Object.hasOwn(GAUGES,g) || !Array.isArray(vector) || vector.length!==2)
    throw new TypeError("K4 transport needs two measured coordinates");
  const x = vector.map((v,i) => finite(Math.abs(v),`coordinate ${i}`) * (v < 0 ? -1 : 1));
  return Object.freeze([(GAUGES[g] & 1) ? -x[0] : x[0],(GAUGES[g] & 2) ? -x[1] : x[1]]);
}
/** Energy ||δx||². Nonnegative, with gauge invariance checked by tests. */
export function kleinSheafEnergy(sections,edges) {
  let energy=0;
  for(const edge of edges){
    const left=sections[edge.from],right=sections[edge.to];
    if (!Array.isArray(left)||!Array.isArray(right)||left.length!==2||right.length!==2)
      throw new TypeError("missing two-coordinate sheaf section");
    const moved=kleinTransport(edge.gauge,right);
    const weight=finite(edge.weight??1,"edge weight");
    energy+=weight*((left[0]-moved[0])**2+(left[1]-moved[1])**2);
  }
  if(!Number.isFinite(energy))throw new RangeError("sheaf energy overflow");
  return energy;
}
function gaugeComponents(ids,links) {
  const adj=new Map(ids.map(id=>[id,[]]));
  for(const edge of links){
    const g=GAUGES[edge.gauge];
    adj.get(edge.from).push([edge.to,g]);
    adj.get(edge.to).push([edge.from,g]);
  }
  const phase=new Map(),component=new Map(),curvature=[];
  let group=0;
  for(const id of ids) {
    if(phase.has(id))continue;
    const here=group++,visit=[id];phase.set(id,0);component.set(id,here);
    while(visit.length){
      const x=visit.shift();
      for(const [y,g] of adj.get(x)){
        const transported=phase.get(x)^g;
        if(!phase.has(y)){phase.set(y,transported);component.set(y,here);visit.push(y)}
        else if(phase.get(y)!==transported)
          curvature.push(Object.freeze({from:x,to:y,group:here,holonomy:transported^phase.get(y)}));
      }
    }
  }
  return {component,curved:new Set(curvature.map(x=>x.group)),curvature};
}
/** Simulate conservative goodput with no work invented, lost, or migrated without evidence. */
export function forecastKleinCapacityFlow({
  nodes,links,work,asOf,horizonTicks=30,tickMilliseconds=1000,maxEvidenceAgeMs=3600000,
}={}) {
  const observed=clock(asOf);
  whole(horizonTicks,"horizonTicks",300);
  if(horizonTicks<1)throw new TypeError("horizonTicks must be positive");
  whole(tickMilliseconds,"tickMilliseconds",60000);
  if(tickMilliseconds<1)throw new TypeError("tickMilliseconds must be positive");
  whole(maxEvidenceAgeMs,"maxEvidenceAgeMs",86400000);
  if(!Array.isArray(nodes)||nodes.length<1||nodes.length>64||
      !Array.isArray(links)||links.length>256||work?.portable!==true ||
      !nameOf(work.kind,"work.kind")||!Array.isArray(work.requiredRights)||
      work.requiredRights.some(x=>typeof x!=="string"||!x))
    throw new TypeError("bounded portable work, nodes and links are required");
  const idMap=new Map();
  for(const n of nodes){
    const id=nameOf(n?.id,"node id");
    if(idMap.has(id))throw new TypeError("duplicate capacity node");
    for(const k of ["backlog","arrivalsPerTick","servicePerTick"])whole(n[k],k);
    if(!Array.isArray(n.allowedKinds)||!Array.isArray(n.rights))
      throw new TypeError("node capability scope is missing");
    finite(n.reliabilityRisk??0,"node reliability risk");
    const time=n.observedAt==null?null:clock(n.observedAt);
    idMap.set(id,{...n,time});
  }
  const pairSet=new Set();
  for(const link of links){
    if(!idMap.has(link?.from)||!idMap.has(link?.to)||link.from===link.to)
      throw new TypeError("link refers to absent/self node");
    if(!Object.hasOwn(GAUGES,link.gauge))throw new TypeError("link requires K4 gauge");
    const key=[link.from,link.to].sort().join("::");
    if(pairSet.has(key))throw new TypeError("duplicate undirected transport connection");
    pairSet.add(key);
    whole(link.maxTransfersPerTick,"maxTransfersPerTick");
    whole(link.latencyMilliseconds,"latencyMilliseconds",60000);
    finite(link.weight??1,"edge weight");
  }
  const ids=[...idMap.keys()].sort();
  const {component,curved,curvature}=gaugeComponents(ids,links);
  const sourceReady=n=>n?.entitlement==="verified"&&NI.test(n.capacityEvidence??"") &&
    n.time!==null&&n.time<=observed&&(observed-n.time)<=maxEvidenceAgeMs &&
    n.allowedKinds.includes(work.kind)&&work.requiredRights.every(right=>n.rights.includes(right));
  const admissible=links.filter(l=>{
    const dest=idMap.get(l.to);
    return !curved.has(component.get(l.from))&&sourceReady(dest)&&
      NI.test(l.authorityEvidence??"")&&l.durableTransfer===true &&
      l.costCeilingKnown===true&&l.latencyMilliseconds<=tickMilliseconds;
  });
  const refused=links.filter(l=>!admissible.includes(l)).map(l=>({
    from:l.from,to:l.to,
    reason:curved.has(component.get(l.from))?"nontrivial-K4-holonomy":
      !sourceReady(idMap.get(l.to))?"destination-capacity-or-rights-unverified":
      !NI.test(l.authorityEvidence??"")||l.durableTransfer!==true?"transfer-custody-unqualified":
      l.costCeilingKnown!==true?"transfer-cost-unknown":"latency-exceeds-tick-resolution",
  }));
  const physical=q=>Object.fromEntries(ids.map(id=>[id,q[id]]));
  const initial=Object.fromEntries(ids.map(id=>[id,idMap.get(id).backlog]));
  const drive=allowOffload=>{
    const queue={...initial};
    const sent=new Map(),received=new Map();
    for(let tick=0;tick<horizonTicks;tick++){
      for(const id of ids)queue[id]+=idMap.get(id).arrivalsPerTick;
      if(allowOffload){
        // A received unit cannot be re-exported across a second border in
        // the same tick. Every hop requires its own durable receiving event.
        const sourceBudget={...queue};
        const pressure=id=>queue[id]/Math.max(1,idMap.get(id).servicePerTick);
        const edges=admissible.map(l=>({l,gap:pressure(l.from)-pressure(l.to)-l.latencyMilliseconds/tickMilliseconds}))
          .filter(e=>e.gap>0)
          .sort((a,b)=>b.gap-a.gap||a.l.from.localeCompare(b.l.from));
        for(const {l} of edges){
          const spare=Math.max(0,idMap.get(l.to).servicePerTick-queue[l.to]);
          const count=Math.min(sourceBudget[l.from],spare,l.maxTransfersPerTick);
          if(count<=0)continue;
          sourceBudget[l.from]-=count;
          queue[l.from]-=count;queue[l.to]+=count;
          const key=l.from+"→"+l.to;sent.set(key,(sent.get(key)??0)+count);
        }
      }
      for(const id of ids){
        const completed=Math.min(queue[id],idMap.get(id).servicePerTick);
        queue[id]-=completed;
        received.set(id,(received.get(id)??0)+completed);
      }
    }
    return {completed:[...received.values()].reduce((a,b)=>a+b,0),
      remaining:Object.fromEntries(ids.map(id=>[id,queue[id]])),
      acceptedWork:ids.reduce((s,id)=>s+idMap.get(id).backlog+idMap.get(id).arrivalsPerTick*horizonTicks,0),
      transfers:[...sent].map(([route,count])=>({route,forecastWorkUnits:count})).sort((a,b)=>a.route.localeCompare(b.route))};
  };
  const baseline=drive(false),routed=drive(true);
  const totalFinal=Object.values(routed.remaining).reduce((a,b)=>a+b,0);
  if(baseline.acceptedWork!==baseline.completed+Object.values(baseline.remaining).reduce((a,b)=>a+b,0) ||
     routed.acceptedWork!==routed.completed+totalFinal)
    throw new Error("work conservation violated");
  const sections=Object.fromEntries(ids.map(id=>{
    const node=idMap.get(id);
    return [id,[node.backlog/Math.max(1,node.servicePerTick),node.reliabilityRisk??0]];
  }));
  return Object.freeze({
    kind:"K4ConstrainedCapacityFlowForecast",
    model:"finite-conservative-work-fluid-forecast-v1",
    experimental:true,forecastOnly:true,providerReadbackIndependentlyVerified:false,
    mathematicalBasis:"Obsmetrologia.Positing.Gauge.K4 (group laws) and finite sheaf coboundary energy; no planner optimality theorem",
    workKind:work.kind,asOf,horizonTicks,tickMilliseconds,
    kleinGauge:{holonomyConflicts:curvature,flatTransportEdges:admissible.length,
      sheafEnergy:kleinSheafEnergy(sections,links),energyIsPhysicalCapacity:false},
    baseline,routed,goodputGainUnits:routed.completed-baseline.completed,
    refusedLinks:refused,actionable:false,
    custody:"work ids, exact source/receiver admission, actual provider capacity and settlement must be independently received before any move",
  });
}
