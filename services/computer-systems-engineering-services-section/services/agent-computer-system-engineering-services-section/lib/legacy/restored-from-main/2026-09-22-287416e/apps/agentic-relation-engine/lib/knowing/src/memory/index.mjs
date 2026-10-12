/**
 * memory — the agent's memory carrier (the settled body of held knowledge),
 * derived from @red-cup-engineering/relating (markdown codec + settlement).
 *
 * The memory carrier for learning's codomain: the settled body of held knowledge.
 */
export {
  admitDocument,
  admitMemory,
  settleMemory,
  settleMemoryFiltration,
  observeMemory,
  inspectMemoryHealth,
  inspectMemoryTopic,
  measureMemoryGap,
  conceptMapMemory,

} from "./carrier.mjs";

export {
  markdownSemanticLinefeedText,
  normalizeMarkdownLinefeeds,

} from "./normalization.mjs";

export {
  memoryActions,
  normalizeMarkdownLinefeedsAction,
} from "./actions.mjs";
