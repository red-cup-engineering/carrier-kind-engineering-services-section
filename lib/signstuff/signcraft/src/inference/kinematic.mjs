// Kinematic reading of a real SignCraft inference derivation.
// This is computation over witnessed dependency motion, not a Lorentzian metric
// or proof that an external rule issuer was authenticated. SignChain owns rules.
const MAX_EVENTS=200_000;

/** Return a dependency-ordered proof-motion plan with its critical path depth.
 * All cited antecedents must exist and precede their conclusion. Detect
 * malformed, cyclic or truncated histories without recursive call-stack growth.
 * Unknown targets return null; invalid histories refuse explicitly.
 */
export function motionOfDerivation(derivation,target){
  if(!(derivation instanceof Map))throw new TypeError("a derivation Map is required");
  if(typeof target!=="string"||target.length===0)throw new TypeError("nonempty target attribute required");
  if(!derivation.has(target))return null;
  const color=new Map(),depth=new Map(),chain=[];
  const stack=[{key:target,entered:false,next:0}];
  while(stack.length){
    if(stack.length>MAX_EVENTS||chain.length>MAX_EVENTS)
      throw new RangeError("proof motion exceeds the bounded event profile");
    const frame=stack.at(-1),key=frame.key;
    const node=derivation.get(key);
    if(!frame.entered){
      if(!node||typeof node!=="object"||node.attr!==key||
         typeof node.by!=="string"||node.by.length===0||
         !Array.isArray(node.premises)){
        throw new TypeError("malformed derivation event: "+key);
      }
      if(node.premises.some(p=>typeof p!=="string"||p.length===0))
        throw new TypeError("unresolved premise in derivation event: "+key);
      frame.entered=true;
      color.set(key,"visiting");
    }
    if(frame.next<node.premises.length){
      const premise=node.premises[frame.next++];
      if(!derivation.has(premise))
        throw new RangeError("missing premise "+premise+" for "+key);
      const status=color.get(premise);
      if(status==="visiting")throw new RangeError("cyclic proof motion: "+premise+" -> "+key);
      if(status!=="visited")stack.push({key:premise,entered:false,next:0});
      continue;
    }
    // Only after all predecessors are completed can this motion be admitted.
    let rank=0;
    for(const p of node.premises)rank=Math.max(rank,depth.get(p)+1);
    depth.set(key,rank);
    color.set(key,"visited");
    chain.push({
      attr:key,by:node.by,premises:[...node.premises],
      ...(node.ruleId===undefined?{}:{ruleId:node.ruleId})
    });
    stack.pop();
  }
  return Object.freeze({
    target,chain,
    stages:Object.freeze(chain.map((step,index)=>Object.freeze({
      attr:step.attr,index,stage:depth.get(step.attr)
    }))),
    criticalPathLength:depth.get(target),
    eventCount:chain.length,
    dependencyCount:chain.reduce((n,s)=>n+s.premises.length,0)
  });
}


/**
 * Schedule the smallest target-dependent rule wavefront after a caller-supplied
 * set of already available attributes. The caller's available evidence is an
 * ASSUMPTION, not an authentication or theorem. Missing "given" leaves remain
 * unresolved obligations, never executable inference steps.
 *
 * Each wave is the earliest possible round for its events if independent rules
 * may execute concurrently. This is a dependency plan, not a proof that the
 * rules preserve an interpreted judgment (Lean receives that separately).
 *
 * The full source DAG is validated first, including parts cut by the available
 * frontier, so known data cannot disguise a malformed derivation.
 */
export function scheduleOfDerivation(derivation, target, available = []) {
  if (!Array.isArray(available) || available.some(a => typeof a !== "string" || a.length === 0))
    throw new TypeError("kinematic schedule requires an array of nonempty available attributes");
  const motion = motionOfDerivation(derivation, target);
  if (motion === null) return null;
  const known = new Set(available);
  const required = new Set();
  const pending = [target];
  while (pending.length) {
    const key = pending.pop();
    if (known.has(key) || required.has(key)) continue;
    required.add(key);
    for (const premise of derivation.get(key).premises) pending.push(premise);
  }

  const rounds = [], stage = new Map(), blocked = new Set(), missing = new Set();
  for (const step of motion.chain) {
    if (!required.has(step.attr)) continue;
    // An unwitnessed "given" is a demand on the caller, not a rule to run.
    if (step.by === "given" && step.premises.length === 0) {
      missing.add(step.attr);
      blocked.add(step.attr);
      continue;
    }
    if (step.premises.some(p => blocked.has(p))) {
      blocked.add(step.attr);
      continue;
    }
    let round = 0;
    for (const p of step.premises) {
      if (known.has(p)) continue;
      if (!stage.has(p)) throw new TypeError("kinematic schedule: unresolved dependent event " + p);
      round = Math.max(round, stage.get(p) + 1);
    }
    stage.set(step.attr, round);
    (rounds[round] ??= []).push(Object.freeze({
      attr: step.attr, by: step.by,
      premises: Object.freeze([...step.premises]),
      ...(step.ruleId === undefined ? {} : { ruleId: step.ruleId }),
    }));
  }
  return Object.freeze({
    kind: "signcraft.kinematic.wavefront",
    admissionLevel: "structural-only",
    target,
    complete: known.has(target) || !blocked.has(target),
    assumedAvailable: Object.freeze([...known].sort()),
    openAssumptions: Object.freeze([...missing].sort()),
    blockedEvents: Object.freeze([...blocked].sort()),
    prunedEventCount: motion.eventCount - required.size,
    executableEventCount: stage.size,
    parallelRounds: rounds.length,
    waves: Object.freeze(rounds.map(wave => Object.freeze(wave))),
  });
}
