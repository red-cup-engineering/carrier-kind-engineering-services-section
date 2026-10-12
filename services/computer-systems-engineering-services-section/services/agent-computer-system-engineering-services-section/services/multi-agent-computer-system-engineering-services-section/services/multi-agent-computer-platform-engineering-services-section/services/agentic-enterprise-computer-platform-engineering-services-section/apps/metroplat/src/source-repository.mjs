import { readHarnessCarriers } from "./offices.mjs";
import { workSourceTaskContract } from "@red-cup-engineering/organizing/work/schema";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { assertRetainedSourceClosure } from "@red-cup-engineering/computer-code-development-engine/workspace/source-closure";
/** A scoped source owner is a configured Git repository, never an arbitrary caller path. */
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const remote = root => git(root, ["remote", "get-url", "origin"]);

export function configuredSourceRepository(repositoryRoot, declaredOwner) {
  const root = realpathSync(repositoryRoot);
  const rootOwner = remote(root);
  if (declaredOwner === undefined || declaredOwner === rootOwner) return Object.freeze({ repository: root, sourceRepository: rootOwner });
  if (typeof declaredOwner !== "string" || declaredOwner.length === 0) throw new TypeError("source repository: an exact configured owner is required");
  const modules = path.join(root, ".gitmodules");
  if (!existsSync(modules)) throw new TypeError("source repository: owner is not configured on this host");
  let urls;
  try { urls = git(root, ["config", "--file", modules, "--get-regexp", "^submodule\\..*\\.url$"]); }
  catch { throw new TypeError("source repository: owner is not configured on this host"); }
  const owners = urls.split("\n").map(line => { const split = line.indexOf(" "); return { key: line.slice(0, split), url: line.slice(split + 1) }; }).filter(entry => entry.url === declaredOwner);
  if (owners.length !== 1) throw new TypeError("source repository: owner must identify one configured Git source");
  const relative = git(root, ["config", "--file", modules, "--get", owners[0].key.replace(/\.url$/, ".path")]);
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new TypeError("source repository: configured source path escapes its owner");
  if (!git(root, ["ls-tree", "HEAD", "--", relative]).startsWith("160000 ")) throw new TypeError("source repository: configured source is not a Git-owned gitlink");
  const repository = realpathSync(path.join(root, relative));
  if (!repository.startsWith(root + path.sep)) throw new TypeError("source repository: configured source path escapes its owner");
  if (realpathSync(git(repository, ["rev-parse", "--show-toplevel"])) !== repository || remote(repository) !== declaredOwner) throw new TypeError("source repository: initialized source origin does not match its configured custody");
  return Object.freeze({ repository, sourceRepository: declaredOwner });
}


/** Resolve an allocated work source using host custody. Receiving retains the producing owner. */
export function configuredWorkSourceRepository(repositoryRoot, { item, receiving = false, sourceBinding: captured }, { operationOf, sourceBindingOf } = {}) {
  const owner = receiving ? item?.proposal?.sourceRepository : item?.sourceRepository;
  if (owner === undefined) {
    if (item?.sourceRepository !== undefined || item?.execution?.sourceRepository !== undefined) throw new TypeError("source workspace: original sourceRepository is unresolved");
    const work = receiving ? item?.proposal : item;
    const capabilities = work?.requiresCapabilities;
    if (!Array.isArray(capabilities)) throw new TypeError("source workspace: admitted work sourceRepository or explicit source-free method is required");
    if (capabilities.some(verb => typeof verb !== "string" || verb.startsWith("duty-worktree-"))) throw new TypeError("source workspace: admitted work sourceRepository is required for source capabilities");
    // Empty methods and installed pure operations need no repository. Host-read/external
    // operations have no implied source-free meaning: their workspace contract stays explicit.
    for (const verb of capabilities) {
      const operation = operationOf?.(verb);
      if (operation?.locus === "duty") throw new TypeError("source workspace: admitted work sourceRepository is required for source capabilities");
      if (operation?.effects?.class !== "pure") throw new TypeError("source workspace: source-free capability semantics are not established");
    }
    return Object.freeze({ mode: "no-source", effects: "read-only" });
  }
  if (typeof owner !== "string" || owner.trim() === "") throw new TypeError("source workspace: admitted work sourceRepository is required");
  if (receiving && item.sourceRepository !== owner) throw new TypeError("source workspace: proposal sourceRepository no longer matches its admitted obligation");
  const retained = captured ?? (receiving ? item?.proposal?.sourceBinding : item?.execution?.sourceBinding);
  if (sourceBindingOf !== undefined) {
    let resolved;
    try { resolved = sourceBindingOf({ sourceRepository: owner, retained, item, receiving }); }
    catch { throw new TypeError("source workspace: trusted exact source custody resolution failed"); }
    if (resolved?.then !== undefined) throw new TypeError("source workspace: synchronous retained source custody resolution is required");
    const sourceBinding = assertRetainedSourceClosure(resolved);
    if (sourceBinding.copy.sourceRepository !== owner || retained !== undefined && sourceBinding.id !== retained.id) throw new TypeError("source workspace: original exact source closure changed");
    return Object.freeze({ repository: sourceBinding.copy.repository, sourceRepository: owner, sourceBinding });
  }
  if (retained !== undefined) throw new TypeError("source workspace: original exact source closure requires its trusted host binding");
  try { return configuredSourceRepository(repositoryRoot, owner); }
  catch (cause) {
    throw new TypeError("source workspace: configured writable Git source custody is unavailable for the admitted sourceRepository; the immutable release is not a source workspace", { cause });
  }
}


/** Resolve an existing observed source task from the current native work and session.
 * Private host callbacks supply the carrier and custody; request paths never participate. */
export async function configuredWorkSourceTask({ scope, identity, execution, workBinding, callerBinding = workBinding, repositoryRoot,
  carrierOf, authorizeReceiving, sourceBindingOf }) {
  const { readAgentWorkDispatchReadout } = await import("@red-cup-engineering/feltos/work/dispatch-readout");
  const { currentHarnessCarriers, providersOfAccount } = await import("./offices.mjs");
  const { workSourceTaskContract } = await import("@red-cup-engineering/organizing/work/schema");
  const fail = message => { throw new TypeError(`source task: ${message}`); };
  if (typeof scope !== "string" || scope.length === 0) fail("exact native duty scope required");
  const date = workBinding.now().slice(0, 10);
  const read = readAgentWorkDispatchReadout(workBinding, date, undefined);
  const relevant = (read?.queue ?? []).filter(item => item.scope === scope);
  if (relevant.length !== 1) fail("current native duty is absent or ambiguous");
  const item = relevant[0];
  if (sourceBindingOf === undefined && item.execution?.sourceBinding === undefined) return undefined;
  if (typeof sourceBindingOf !== "function") fail("private original source custody binding is unavailable");
  if (!identity || typeof identity.actor !== "string" || identity.actor !== execution?.invocation?.subject
    || typeof identity.session !== "string" || typeof identity.office !== "string" || typeof identity.subject !== "string") fail("authenticated original effect context is required");
  const providers = providersOfAccount(callerBinding, identity.actor);
  const held = currentHarnessCarriers(callerBinding).filter(carrier => carrier.session === identity.session && providers.includes(carrier.character));
  if (held.length !== 1) fail("one current observed provider session is required");
  const observed = held[0], task = observed.sourceTask;
  if (task === undefined) fail("original observed source task is unavailable");
  workSourceTaskContract.assert(task, "native source task");
  if (task.scope !== scope || task.subject !== item.subject || identity.subject !== task.subject || identity.office !== task.office) fail("original work subject, scope or office changed");
  const carrier = carrierOf(observed.character);
  if (typeof carrier?.adapter?.verifySourceTask !== "function") fail("original carrier cannot verify its source task");
  let selected = item;
  if (task.role === "production") {
    if (item.state !== "in-flight" || item.allocation !== task.allocation || item.office !== task.office
      || item.delegation?.provider !== observed.character || item.execution?.session !== identity.session
      || item.execution?.model !== observed.model || item.execution?.sourceBinding?.id !== task.sourceBinding) fail("original production allocation or execution is no longer current");
  } else {
    if (!item.reasons?.includes("result-awaiting-receipt") || item.execution?.receipt !== task.proposal) fail("original proposal is no longer awaiting receiving");
    const { workResultProposalByReceipt } = await import("@red-cup-engineering/feltos/work/work-result-proposal");
    const proposal = workResultProposalByReceipt(workBinding, task.proposal, item.execution.subject ?? item.subject);
    if (proposal.sourceBinding?.id !== task.sourceBinding || proposal.sourceResult?.id !== task.sourceResult || proposal.scope !== scope
      || proposal.subject !== task.subject || proposal.origin?.office === task.office) fail("original receiving proposal or independence changed");
    const authority = authorizeReceiving?.({ receiver: observed.character, office: task.office, session: identity.session, model: observed.model, invocation: execution.invocation.id });
    if (authority?.office !== task.office || authority.session !== identity.session || !authority.receivesFrom?.includes(proposal.origin.office)) fail("current receiving office authority is unavailable");
    selected = { agent: observed.character, delegation: { provider: observed.character }, office: task.office, scope, proposal,
      sourceRepository: item.sourceRepository, staffing: { carrier: observed.model, effort: observed.reasoningEffort } };
  }
  const source = configuredWorkSourceRepository(repositoryRoot, { item: selected, receiving: task.role === "receiving" }, { sourceBindingOf });
  if (source.sourceBinding?.id !== task.sourceBinding) fail("original source closure changed");
  await carrier.adapter.verifySourceTask(selected, task, identity.session);
  return task;
}


/** An observation without a newly verified task must not reattest an old source task.
 * Historical native testimony retains the original identity even after a session mask closes. */
export function sourceTaskSessionObservation(dataRoot, character, session) {
  const prior = readHarnessCarriers(dataRoot).filter(value => value.character === character && value.session === session.id && value.sourceTask !== undefined);
  const original = prior[0]?.sourceTask;
  if (original !== undefined && prior.some(value => canonicalJson(value.sourceTask) !== canonicalJson(original))) throw new TypeError("source task: conflicting original session task testimony");
  if (session.sourceTask === undefined) return Object.freeze({ admit: original === undefined });
  workSourceTaskContract.assert(session.sourceTask, "observed carrier source task");
  if (original !== undefined && canonicalJson(session.sourceTask) !== canonicalJson(original)) throw new TypeError("source task: original observed session workspace changed");
  return Object.freeze({ admit: true, sourceTask: session.sourceTask });
}
