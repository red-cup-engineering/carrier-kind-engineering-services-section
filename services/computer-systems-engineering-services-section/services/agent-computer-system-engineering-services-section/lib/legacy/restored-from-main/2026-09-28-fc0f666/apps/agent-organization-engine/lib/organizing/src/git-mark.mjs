/**
 * git-mark - organizing reflection over git federation covers.
 *
 * Computing owns git event carriers. Organizing owns the cover reading: a
 * submodule pin is an external worktree member whose path/url/commit must cohere
 * with the repository cover.
 */
import { coverCarrier } from "./host-neutral-carriers.mjs";
import {
  encodeGitmodules,
  parseGitmodules,
  parseGitSubmoduleStatus,
  parseGitlinks,
} from "@red-cup-engineering/git-services-section/gitmodules";
export { encodeGitmodules, parseGitmodules, parseGitSubmoduleStatus, parseGitlinks };

export function gitSubmoduleCover(
  modules,
  statusEntries = [],
) {
  const statusByPath = new Map(statusEntries.map((entry) => [entry.path, entry]));
  const universe = new Set();
  const opens = modules.map((entry) => {
    const status = statusByPath.get(entry.path);
    const members = [entry.path, entry.url, ...(status === undefined ? [] : [status.commit])];
    for (const member of members) universe.add(member);
    return Object.freeze({
      id: entry.path,
      members: Object.freeze(members),
      source: entry.url,
    });
  });
  const nerveEdges = [];
  for (let leftIndex = 0; leftIndex < opens.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < opens.length; rightIndex += 1) {
      const left = opens[leftIndex];
      const right = opens[rightIndex];
      const rightMembers = new Set(right.members);
      const intersection = left.members.filter((member) => rightMembers.has(member));
      if (intersection.length > 0) nerveEdges.push(Object.freeze({
        left: left.id,
        right: right.id,
        intersection: Object.freeze(intersection),
      }));
    }
  }
  const missingPins = modules.filter((entry) => statusByPath.get(entry.path)?.status !== "pinned").length;
  const h1 = missingPins + Math.max(0, nerveEdges.length - opens.length + connectedComponents(opens.map((entry) => entry.id), nerveEdges));
  return coverCarrier.assert(Object.freeze({
    kind: "organizing.cover",
    universe: Object.freeze([...universe].sort((left, right) => left.localeCompare(right))),
    opens: Object.freeze(opens),
    nerveEdges: Object.freeze(nerveEdges),
    h1,
    coordinationFree: h1 === 0,
  }), "git submodule cover");
}

function connectedComponents(
  nodes,
  edges,
) {
  if (nodes.length === 0) return 0;
  const parent = new Map(nodes.map((node) => [node, node]));
  const find = (value) => {
    const current = parent.get(value) ?? value;
    if (current === value) return current;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  const union = (left, right) => {
    const l = find(left);
    const r = find(right);
    if (l !== r) parent.set(l, r);
  };
  for (const edge of edges) union(edge.left, edge.right);
  return new Set(nodes.map(find)).size;
}
