import {
  admitCustomerTrajectoryFoldback as admitFoldback,
  appendMissionCheckpoint,
  appendTrajectory,
  inducedTrajectoryResolver,
  latestMissionCheckpoint,
  missionMemoryContext,
  promotionReadout,
  recallTrajectories,
} from "./memory.mjs";
export { deriveInducedTrajectoryResolver, trajectoryFingerprint, trajectoryRecipeFingerprint } from "./memory.mjs";
export const appendSoftwareTrajectory = (record, options) => appendTrajectory(record, options);
export const appendSoftwareMissionCheckpoint = (checkpoint, options) => appendMissionCheckpoint(checkpoint, options);
export const readSoftwareMissionCheckpoint = (missionId, sourceIdentity, options) => latestMissionCheckpoint(missionId, sourceIdentity, options);
export const readSoftwareMissionMemoryContext = (objective, taskClass, missionId, sourceIdentity, options) => missionMemoryContext(objective, taskClass, missionId, sourceIdentity, options);
export const recallSoftwareTrajectories = (objective, { taskClass = null, ...options } = {}) => recallTrajectories(objective, { taskClass, ...options });
export const resolveInducedSoftwareTrajectory = (taskClass, options = {}) => inducedTrajectoryResolver(taskClass, options);
export const readSoftwareTrajectoryPromotion = (taskClass, options = {}) => promotionReadout(taskClass, options);
export const admitCustomerTrajectoryFoldback = (activity, expectedCustomer, expectedSupplier, options = {}) => admitFoldback(activity, { expectedCustomer, expectedSupplier, ...options });
