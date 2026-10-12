/**
 * MCP service apex selection for the package operation family.
 */

import type { Operation, RpcAuthorize } from "../../rpc/index.mts";
import { bindOperationHandler, executeOperationHandler } from "../../rpc/handler.mts";
import { projectSurface, type ProjectedSurface } from "../../presentation/index.mts";
import { assembleDefaultServiceMcp } from "./catalog.mts";
import { discoverDataRoots } from "../../integrations/filesystem/services/conurbation.mts";
import { defaultFilesystemBinding } from "../../integrations/filesystem/services/read-write.mts";
import { contentAddress } from "../../lib/identity/index.mts";
import { processPackageRoot } from "../../integrations/process/index.mts";

/**
 * The induced MCP apex, read/write bound to the service's own data root: the
 * node IS the site it admits into, so MCP callers never name a filesystem
 * root. `dataRoot` is required — every derivation (read/write, and every
 * named state-cut) needs a real root to read against; callers with no
 * explicit root pass the package root, same as every other boundary process.
 */
export function defaultMcpApex(dataRoot: string): ProjectedSurface {
  const packageRoot = processPackageRoot(import.meta.url);
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot });
  return assembleDefaultServiceMcp(binding).apex;
}

const DATA_ROOT_QUALIFIER = ":";

/** Requalify one data root's action under its own token, as a plain data
 *  clone — never through `operation()`/`operationKernel`, which registers into the
 *  process-wide category registry on every call; re-registering the same
 *  domain/codomain pair under a second verb per composed apex build would
 *  leak into that registry. `run` and `contract` stay exactly the data root's
 *  own, so the qualified action still executes against that root's own bound
 *  closure and journal; the externally-visible verb and the action's own
 *  address are requalified together, the same requalification
 *  `dataRootQualifiedMount` already does for an HTTP mount's `name` AND its
 *  `nodeId` (`src/presentation/conurbation.mts`), read here for MCP's tool
 *  catalog instead of a URL path.
 *
 *  The address must move with the verb. An operation's `ref` is
 *  `contentAddress(declaration)`, and a declaration carries no settlement — so
 *  N settlements running the same package address equivalently-shaped actions
 *  at the SAME `ref`, necessarily and correctly. Requalifying the verb while
 *  cloning the old `ref` forward makes the coproduct non-disjoint, and
 *  `createOperationCatalog` refuses it (`duplicate declaration`) — refuses it
 *  rightly: that is the Hole endofunctor declining to identify two
 *  constituents that must each retain their own core. A qualified action IS a
 *  distinct mounted action. Address it as one. */
function dataRootQualifiedOperation(act: Operation, token: string): Operation {
  return Object.freeze({
    ...act,
    verb: `${token}${DATA_ROOT_QUALIFIER}${act.verb}`,
    ref: contentAddress({
      kind: "metroplat.rpc.operation-declaration.qualified",
      declaration: act.ref,
      token,
    }),
  });
}

/**
 * The MCP apex for `root`: with zero or one discovered data root this IS
 * `defaultMcpApex(root)`, unchanged. With more than one — `root` itself
 * inhabited alongside constituent data roots beneath it, or several
 * constituents with no independently-inhabited parent — every discovered
 * data root's own apex is built untouched (its own read/write closure, its own
 * journal, nothing shared or pooled) and RETAINED: this process multiplexes
 * several qualified root-bound apices (SAD §7.2), it does not melt them into
 * one. One stdio MCP process can then see N data roots' tools without any two
 * colliding by verb — `obsmetrologia:write` and `metroplat:write` are
 * different tools calling different data roots' own bound closures, never one
 * write choosing between roots.
 *
 * A conurbation MCP process is transport aggregation, not a merged managed
 * element (SAD §7.3): it creates neither a shared journal nor implicit causal
 * edges between roots. Two things carry that, and both are structural rather
 * than advisory:
 *
 * 1. Execution stays root-local because `dataRootQualifiedOperation` clones
 *    each constituent's own `run` forward untouched.
 * 2. Authorization stays root-local because it is DELEGATED here to the
 *    constituent that owns the verb, decided against that settlement's own
 *    admitted capability assertions and with that settlement's OWN operation —
 *    whose `ref` its `standing` map is keyed by, and whose unqualified verb its
 *    grants are written against. A settlement that has admitted no assertion
 *    refuses its own verbs while its neighbours hold theirs. Authority is never
 *    pooled: a grant admitted at one constituent confers nothing at any other.
 *
 * Projecting the qualified actions through `projectSurface` yields the tool
 * catalog, discovery, and description only. Its own `authorize` — which, for a
 * bare operation array, marks every action `held` and conjoins an EMPTY
 * assertion set — is deliberately overridden below and must not be relied on;
 * left in place it would refuse every call at every root, which is precisely
 * the failure the `duplicate declaration` throw used to mask.
 */
export function conurbationMcpApex(root: string): ProjectedSurface {
  const dataRoots = discoverDataRoots(root);
  if (dataRoots.length <= 1) return defaultMcpApex(root);

  const constituents = dataRoots.map((dataRoot) => ({
    token: dataRoot.relativePath,
    apex: defaultMcpApex(dataRoot.path),
  }));

  /** Qualified verb -> the constituent that owns it, and that constituent's own action. */
  const owner = new Map<string, { readonly apex: ProjectedSurface; readonly act: Operation }>();
  const qualifiedOperations = constituents.flatMap(({ token, apex }) =>
    apex.operations.map((act) => {
      const qualified = dataRootQualifiedOperation(act, token);
      owner.set(qualified.verb, { apex, act });
      // Execution routes to the constituent's own action. Handlers are held
      // against an action's identity, not its address, which is exactly what
      // lets two settlements share a root-independent declaration while keeping
      // their own bound closures: a qualified action is a fresh identity and so
      // has no body of its own, and must not be given one. It delegates.
      bindOperationHandler(qualified, (input, arguments_, context) =>
        executeOperationHandler(act, input, arguments_, context));
      return qualified;
    }));

  const aggregate = projectSurface(qualifiedOperations, { packageName: "@red-cup-engineering/metroplat/conurbation" });

  const authorize: RpcAuthorize = (invocation, operation, decidedAt) => {
    const constituent = owner.get(operation.verb);
    if (constituent === undefined) return aggregate.authorize(invocation, operation, decidedAt);
    // The constituent judges its own action — its `standing` is keyed by that
    // action's own address, and its grants are written against that action's own
    // unqualified verb. The decision is then restated to name the action the
    // caller actually invoked: `dispatch` refuses a decision that names an
    // operation other than the one it is about to run, and rightly. Only the
    // subject of the sentence is requalified; the judgment, its charge, and its
    // evidence remain exactly the constituent's own.
    const decision = constituent.apex.authorize(invocation, constituent.act, decidedAt);
    return Object.freeze({ ...decision, operation: operation.ref });
  };

  return Object.freeze({ ...aggregate, authorize });
}
