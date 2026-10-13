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
