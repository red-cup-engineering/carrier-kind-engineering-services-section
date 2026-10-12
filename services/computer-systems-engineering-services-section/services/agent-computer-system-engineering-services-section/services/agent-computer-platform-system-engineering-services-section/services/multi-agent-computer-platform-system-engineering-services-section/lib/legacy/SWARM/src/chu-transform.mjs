// chu-transform.mjs — SWARM's Chu transforms, REBASED onto @lenticule-science/metrologic/chu.
//
// The morphisms of Chu(FOUR) — the adjoint pair (f forward on points, g BACKWARD on states) with the
// one adjointness law s(f a, y) = r(a, g y), their identity/composition/dual functor — were
// hand-rolled here. They now live in the math kernel (@lenticule-science/metrologic/chu/transform), checked over the
// same `.at` surface the rebased chu.mjs exposes. This module re-derives NONE of them; it re-exports
// the kernel arrows. The governed-view instances swarm builds with them (office ↪ EAVT memory) stay
// in swarm's tests/usage; the category lives in the kernel.

export {
  checkChuTransform,
  chuTransform,
  isChuTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "@lenticule-science/metrologic/chu/transform";

export { FOUR } from "@561-group/computer-kernel-process";
