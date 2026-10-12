import { createSemioticExchangeA2aSources } from "@red-cup-engineering/ethereum-services-section/semiotic-exchange-events";
import { composeMembers } from "../kernel/tick.mjs";

export const MARSH_NAME = "Multi-Agent Resource-Sharing Hub";

const READ_ONLY_AUTHORITY = Object.freeze({
  mode: "read-only-observation",
  chainMutation: false,
  signing: false,
  spending: false,
  deployment: false,
  legalCommitment: false,
});

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must contain text`);
  return value;
}

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function byTask(left, right) {
  return `${left.tenant}\u0000${left.taskId}`.localeCompare(`${right.tenant}\u0000${right.taskId}`);
}

function byCoordinate(left, right) {
  return `${left.namespace}\u0000${left.tenant}\u0000${left.key}`.localeCompare(`${right.namespace}\u0000${right.tenant}\u0000${right.key}`);
}

/** Attenuate the existing SemioticExchange projection to a read-only app face. */
export function createMarshAppFace({ history, decodeCarrier, chainId, exchange } = {}) {
  nonempty(chainId, "chainId");
  nonempty(exchange, "exchange");
  const sources = createSemioticExchangeA2aSources({
    history,
    decodeCarrier,
    chainId,
    exchange,
    append: async () => { throw new Error("the read-only MARSH app face has no chain append authority"); },
  });
  return Object.freeze({
    type: "MarshAppFace",
    version: 1,
    name: MARSH_NAME,
    chain: Object.freeze({ chainId, exchange }),
    authority: READ_ONLY_AUTHORITY,
    snapshot: (query) => sources.snapshot(query),
    taskSource: Object.freeze({
      get: (coordinate) => sources.taskSource.get(coordinate),
      list: (query) => sources.taskSource.list(query),
    }),
    coordinationSource: Object.freeze({
      get: (coordinate) => sources.coordinationSource.get(coordinate),
      list: (query) => sources.coordinationSource.list(query),
    }),
  });
}

/** Compose canonical FAE member faces with EVM-carried shared resources. */
export async function composeMarshFace(members, { exchangeFace, tenant = "", onMemberError = "throw" } = {}) {
  if (exchangeFace?.type !== "MarshAppFace" || exchangeFace.authority !== READ_ONLY_AUTHORITY) {
    throw new TypeError("exchangeFace must be a read-only MARSH app face");
  }
  if (typeof tenant !== "string") throw new TypeError("tenant must be a string");
  const fae = composeMembers(members, { onMemberError });
  const { tasks, coordination } = await exchangeFace.snapshot({ tenant });
  return freeze({
    type: "MarshAppFaceReadout",
    version: 1,
    name: MARSH_NAME,
    chain: exchangeFace.chain,
    authority: exchangeFace.authority,
    fae,
    resources: {
      tasks: [...tasks].sort(byTask),
      coordination: [...coordination].sort(byCoordinate),
    },
  });
}
