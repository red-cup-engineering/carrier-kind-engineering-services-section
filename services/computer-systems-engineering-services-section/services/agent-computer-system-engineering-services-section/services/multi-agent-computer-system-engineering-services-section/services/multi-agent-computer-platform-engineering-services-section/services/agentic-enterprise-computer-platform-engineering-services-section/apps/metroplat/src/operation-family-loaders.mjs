/** Dynamic constructors for the operation families MetroPlat composes. This module deliberately
 * has no package-family imports: an owner enters the process only through its matching case. */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lazyOperation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

/** What a node's Claude Code harness is projected from. A session reaches this node's own MetroPlat
 *  server over streamable HTTP, signed in as its harness character's own password principal through a
 *  helper that runs once per connection and again on a 401 (the lifecycle hook alone still uses the
 *  node's machine client); no process is started per session or per event, and
 *  no lifecycle hooks are projected (the harness keeps its own transcripts). The standing
 *  instructions are the repository's AGENTS.md, the one instruction file every agent reads. */
async function claudeHarnessHost(binding) {
  const { agencyRootOf, repositoryRootOf } = await import("@red-cup-engineering/metroplat/offices");
  const { credentialPath } = await import("@red-cup-engineering/credential-custody-service/keep");
  const { agencyAt } = await import("@red-cup-engineering/organizing/agency/held");
  // The machine client (the lifecycle hook's) secret is a credential of the host's store, rendered into CREDENTIALS_DIRECTORY.
  const clientEnvironment = () => process.env.METROPLAT_NODE_CLIENT_ENV ?? credentialPath("bare-cedar-fog.561.group-mcp-client.env");
  // A session names the server by the origin it declares as its protected resource: a client
  // checks the resource metadata against the URL it connected to, so the bind address fails.
  const mcpUrl = () => {
    if (process.env.METROPLAT_NODE_MCP_URL) return process.env.METROPLAT_NODE_MCP_URL;
    if (process.env.PUBLIC_BASE_URL) return new URL("/mcp", process.env.PUBLIC_BASE_URL).href;
    if (!process.env.PORT) throw new Error("claude-harness-project needs this server's PORT (or METROPLAT_NODE_MCP_URL) to point sessions at it");
    return `http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT}/mcp`;
  };
  // The session signs in as its harness character's own password principal, not as the node's machine
  // client and not as the founder: the helper reads the username from the character's metroplat
  // sign-in organ and the password from the host credentials (claude-harness.env), drives the node's
  // password sign-in and PKCE flow, and keeps the access token under the user's runtime directory.
  // It prints the session's id too when the harness tells it, so the session's hand outlives reconnects.
  const signInEnvironment = () => process.env.METROPLAT_CLAUDE_SIGN_IN_ENV ?? credentialPath("claude-harness.env");
  const harnessCharacterId = () => {
    const agency = agencyAt(agencyRootOf(binding));
    const characters = [...agency.characters.values()].filter((c) => c.kind === "harness" && c.harness === "claude"
      && (process.env.CREDENTIALS_HOST === undefined || c.host === process.env.CREDENTIALS_HOST));
    if (characters.length !== 1) throw new Error(`claude-harness-project needs exactly one claude harness character on this host, found ${characters.length}`);
    return characters[0].id;
  };
  const headersHelper = (url) => [
    JSON.stringify(process.execPath), JSON.stringify(fileURLToPath(import.meta.resolve("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/claude-code/mcp-headers"))),
    "--url", JSON.stringify(url), "--agency-root", JSON.stringify(agencyRootOf(binding)),
    "--character", JSON.stringify(harnessCharacterId()), "--credentials", JSON.stringify(signInEnvironment()),
  ].join(" ");
  // One harness event in on stdin, this node's answer out on stdout: the event is admitted as the
  // node's harness character, and a refusal answers nothing rather than landing in a session's context.
  const hookCommand = (url) => [
    `set -a; . ${JSON.stringify(clientEnvironment())}; set +a;`,
    `t=$(curl -sf -m 4 -X POST ${JSON.stringify(url.replace(/\/mcp$/u, "/oauth/token"))}`,
    `--data-urlencode grant_type=client_credentials --data-urlencode "client_id=$MCP_CLIENT_ID"`,
    `--data-urlencode "client_secret=$MCP_CLIENT_SECRET" --data-urlencode "resource=$MCP_ORIGIN/mcp" | jq -r .access_token) || exit 0;`,
    `jq -c '{jsonrpc: "2.0", id: 1, method: "tools/call", params: {name: "metroplat_harness-hook-event-admit", arguments: {harness: "claude", payload: .}}}'`,
    `| curl -sf -m 8 -X POST ${JSON.stringify(url)} -H "Authorization: Bearer $t" -H "content-type: application/json" -H "accept: application/json"`,
    `--data-binary @- | jq -r 'if .result.isError then empty else (.result.content[0].text // empty) end'; exit 0`,
  ].join(" ");
  return {
    harness: "claude",
    get agencyRoot() { return agencyRootOf(binding); },
    get repoRoot() { return repositoryRootOf(binding); },
    dataRoot: binding.dataRoot,
    get hookCommand() { return hookCommand(mcpUrl()); },
    mcpServers: () => { const url = mcpUrl(); return { metroplat: { type: "http", url, headersHelper: headersHelper(url) } }; },
    standing: () => "@../AGENTS.md",
    // The host declaration (FELTOS_ENTERPRISE_HOST) holds this host's harness policy; without one the
    // projection's own default deny list stands.
    ...harnessPolicyOf(process.env.FELTOS_ENTERPRISE_HOST),
  };
}

/** The `deny` a FeltOS host declaration holds for the harnesses it projects, or nothing. */
function harnessPolicyOf(hostPath) {
  if (!hostPath) return {};
  try {
    const deny = JSON.parse(readFileSync(hostPath, "utf8")).harness?.deny;
    return Array.isArray(deny) ? { deny } : {};
  } catch {
    return {};
  }
}

async function workOptionsFor(binding, workOptions) {
  const [{ agencyRootOf, harnessModelCharacterResolver, providersOfAccount }, { firmPoolAuthorityResolver }] = await Promise.all([
    import("@red-cup-engineering/metroplat/offices"),
    import("@red-cup-engineering/metroplat/firm-pool-authority"),
  ]);
  const { allocationSources } = await import("./allocation-sources.mjs");
  return {
    ...allocationSources(binding),
    resolveAgencyWorkAuthority: (allocation) => firmPoolAuthorityResolver({ firmPoolRoot: agencyRootOf(binding) })(allocation),
    resolveModelCharacter: (character) => harnessModelCharacterResolver(binding)(character),
    providersOfSubject: (subject) => providersOfAccount(binding, subject),
    ...workOptions,
  };
}

/** The micro-enterprises' own roots and books on this host, read from its agency: an enterprise's
 *  records are kept in its own root, and the books are those of the legal entity whose holdings
 *  book is the configured book of record, consolidated with its micro-enterprises' own. */
async function enterpriseHoldings(binding) {
  const [{ entityBooks, entityOfBook, enterpriseRoots, enterpriseStore }, { agencyAt, agencyRootOf, repositoryRootOf }] = await Promise.all([
    import("@red-cup-engineering/organizing/enterprise"), import("@red-cup-engineering/metroplat/offices"),
  ]);
  const agency = () => agencyAt(agencyRootOf(binding));
  // The agency may be read from a release; enterprises keep their roots and books in the working tree.
  const repositoryRoot = repositoryRootOf(binding);
  const roots = enterpriseRoots(agency, { repositoryRoot });
  const store = enterpriseStore(binding, { roots });
  const books = () => {
    const holdings = process.env.METROPLAT_LEDGER_JOURNAL || undefined;
    const entity = holdings && entityOfBook(agency(), holdings, { repositoryRoot });
    return entity ? entityBooks(agency(), entity, { repositoryRoot }) : { holdings, members: [] };
  };
  const settlementsOf = (enterprise, since) => store.read("settlement", { enterprise }).filter((record) => !since || String(record.recordedAt) >= since);
  return { agency, store, books, settlementsOf, rootOf: roots.rootOf };
}

/** Import and construct one owning package's complete family. */
export async function loadOperationFamily(module, binding, context = {}) {
  switch (module) {
    case "@red-cup-engineering/metroplat/inducing": return (await import("@red-cup-engineering/relating/operations/inducing")).inducingOperations;
    case "@red-cup-engineering/metroplat/realization": return (await import("@red-cup-engineering/relating/operations/realization")).realizationOperations;
    case "@red-cup-engineering/metroplat/positing": return (await import("@red-cup-engineering/relating/operations/positing")).positingOperations;
    case "@red-cup-engineering/metroplat/markdown": return (await import("@red-cup-engineering/knowledge-system-server/workbench/markdown-edit")).markdownOperations;
    case "@red-cup-engineering/metroplat/lsp": {
      const { metroplatLspOperationFor } = await import("@red-cup-engineering/metroplat/lsp/operation");
      return Object.freeze([metroplatLspOperationFor(context.operationSource ?? (() => []), {
        packageName: context.packageName ?? "@red-cup-engineering/metroplat",
        ...(context.resourceDescriptors === undefined ? {} : { resourceDescriptors: context.resourceDescriptors }),
        ...(context.promptDescriptors === undefined ? {} : { promptDescriptors: context.promptDescriptors }),
      })]);
    }
    case "@red-cup-engineering/metroplat/offices": return (await import("@red-cup-engineering/metroplat/offices")).officeOperations(binding, context.sourceSet ?? (() => []));
    case "@red-cup-engineering/metroplat/world": return (await import("@red-cup-engineering/metroplat/world")).worldOperations(binding, context.operationSource ?? (() => []), context.workOptions?.instanceIdentity, { characterCommunication: context.workOptions?.characterCommunication,actorMesh:context.workOptions?.actorMesh, executeWorld:context.workOptions?.executeWorld });
    case "@red-cup-engineering/metroplat/claude-harness": return (await import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/claude-code/harness-projection")).claudeHarnessOperations(await claudeHarnessHost(binding));
    case "@red-cup-engineering/metroplat/codex-harness": {
      const [{ codexHarnessOperations }, { repositoryRootOf }] = await Promise.all([
        import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/operations"),
        import("@red-cup-engineering/metroplat/offices"),
      ]);
      return codexHarnessOperations(binding, { workspace: repositoryRootOf(binding), environment: context.workOptions?.environment ?? context.environment ?? process.env });
    }
    case "@red-cup-engineering/metroplat/lean": return (await import("@red-cup-engineering/lean-system-services-section/operations")).leanCheckOperations(binding);
    case "@red-cup-engineering/metroplat/integrations/filesystem": {
      const owner = await import("@red-cup-engineering/metroplat/resources/read-write-verbs");
      return owner.withFilesystemBinding(owner.filesystemOperations, binding);
    }
    case "@red-cup-engineering/metroplat/markdown-files": {
      const [{ markdownFileWorkbenchOperations }, { readAtRoot, writeAtRoot }] = await Promise.all([
        import("@red-cup-engineering/knowledge-system-server/workbench/markdown"), import("@red-cup-engineering/metroplat/resources/read-write-verbs"),
      ]);
      return markdownFileWorkbenchOperations({ ...binding, resources: { readAtRoot, writeAtRoot } });
    }
    case "@red-cup-engineering/metroplat/arc42-sad": return (await import("@red-cup-engineering/knowledge-system-server/workbench/arc42")).arc42SadWorkbenchOperations(binding);
    case "@red-cup-engineering/metroplat/specifications": return (await import("@red-cup-engineering/knowledge-system-server/workbench/specification")).specificationWorkbenchOperations(binding);
    case "@red-cup-engineering/metroplat/claude-fleet": return (await import("@red-cup-engineering/feltos/agents/sessions/claude-code/fleet/service")).claudeFleetOperations(binding);
    case "@red-cup-engineering/metroplat/claude-sessions": return (await import("@red-cup-engineering/feltos/agents/sessions/claude-code/service")).claudeSessionOperations(binding);
    case "@red-cup-engineering/metroplat/agent-coordination": return (await import("@red-cup-engineering/computer-code-development-engine/agent/service")).agentCoordinationOperations(binding, {actorMesh:context.workOptions?.actorMesh,developmentRequestAt:context.workOptions?.developmentRequestAt,operations:context.operationSource});
    case "@red-cup-engineering/metroplat/claim-sessions": return (await import("@red-cup-engineering/feltos/claims/service")).claimSessionOperations(binding);
    case "@red-cup-engineering/metroplat/codex-sessions": return (await import("@red-cup-engineering/feltos/agents/sessions/codex/service")).codexSessionOperations(binding);
    case "@red-cup-engineering/metroplat/openai-pricing": return (await import("@red-cup-engineering/computer-inference-engine/openai/pricing/operations")).openAIPricingOperations(binding);
    case "@red-cup-engineering/metroplat/ledger": return (await import("@red-cup-engineering/farolfi/ledger/operations")).ledgerReportOperations(binding, { books: (await enterpriseHoldings(binding)).books });
    case "@red-cup-engineering/metroplat/ledger-maintenance": {
      const [{ ledgerMaintenanceOperations }, { books, settlementsOf }] = await Promise.all([import("@red-cup-engineering/farolfi/ledger/operations"), enterpriseHoldings(binding)]);
      return ledgerMaintenanceOperations(binding, { settlementsOf, books });
    }
    case "@red-cup-engineering/metroplat/energy-accounting": return (await import("@red-cup-engineering/farolfi/energy/operations")).energyAccountingOperations();
    case "@red-cup-engineering/metroplat/marsh": return (await import("@red-cup-engineering/multi-agent-resource-sharing-host/resource-operations")).marshResourceOperations;
    case "@red-cup-engineering/metroplat/marsh-hive-engine": return (await import("@red-cup-engineering/multi-agent-resource-sharing-host/resource-operations.hive-engine")).marshHiveEngineResourceOperations;
    case "@red-cup-engineering/metroplat/agent-token-usage": return (await import("@red-cup-engineering/feltos/agents/sessions/token-usage/service")).agentTokenUsageOperations(binding);
    case "@red-cup-engineering/metroplat/work-coordination": return (await import("@red-cup-engineering/feltos/work/service")).workCoordinationOperations(binding, await workOptionsFor(binding, context.workOptions ?? {}));
    case "@red-cup-engineering/metroplat/proof-health": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/proof-health")).proofHealthOperations(binding, context.operationSource ?? (() => []));
    case "@red-cup-engineering/metroplat/attention-allocation": return (await import("@red-cup-engineering/attention-allocation-readout-service/operations")).attentionAllocationOperations();
    case "@red-cup-engineering/metroplat/kalshi": return (await import("@red-cup-engineering/kalshi-services-section/operations")).kalshiOperations(binding);
    case "@red-cup-engineering/metroplat/hive-curation": return (await import("@red-cup-engineering/run-hive-curation-cycle-service/operations")).hiveCurationOperations();
    case "@red-cup-engineering/metroplat/polymarket": return (await import("@red-cup-engineering/polymarket-services-section/operations")).polymarketOperations();
    case "@red-cup-engineering/metroplat/hive-games": return (await import("@red-cup-engineering/hive-fleet-operations-service/operations")).hiveGamesOperations();
    case "@red-cup-engineering/metroplat/land-contracts": {
      const [{ landContractOperations }, { contractingPartyFor }, { agency, store }] = await Promise.all([import("@red-cup-engineering/land-contracts-services-section/operations"), import("@red-cup-engineering/organizing/enterprise"), enterpriseHoldings(binding)]);
      return landContractOperations(binding, { store, contractingParty: (id) => contractingPartyFor(agency(), id) });
    }
    case "@red-cup-engineering/metroplat/structural-claims": return (await import("@red-cup-engineering/structural-claims-register-services-section/operations")).structuralClaimsOperations(binding, { store: (await enterpriseHoldings(binding)).store });
    case "@red-cup-engineering/metroplat/heir-search": {
      const [{ heirSearchOperations }, { contractingPartyFor }, { agency, store }] = await Promise.all([import("@red-cup-engineering/heir-search-services-section/operations"), import("@red-cup-engineering/organizing/enterprise"), enterpriseHoldings(binding)]);
      return heirSearchOperations(binding, { store, contractingParty: (id) => contractingPartyFor(agency(), id) });
    }
    case "@red-cup-engineering/metroplat/us-representation": {
      const [{ usRepresentationOperations }, { contractingPartyFor }, { agency, store }] = await Promise.all([import("@red-cup-engineering/us-representation-services-section/operations"), import("@red-cup-engineering/organizing/enterprise"), enterpriseHoldings(binding)]);
      return usRepresentationOperations(binding, { store, contractingParty: (id) => contractingPartyFor(agency(), id) });
    }
    case "@red-cup-engineering/metroplat/enterprise": {
      const [{ enterpriseOperations }, offices, land, heir, claims, representation] = await Promise.all([import("@red-cup-engineering/organizing/enterprise"), import("@red-cup-engineering/metroplat/offices"), import("@red-cup-engineering/land-contracts-services-section/pipeline"), import("@red-cup-engineering/heir-search-services-section/operations"), import("@red-cup-engineering/structural-claims-register-services-section/register"), import("@red-cup-engineering/us-representation-services-section/operations")]);
      const { store } = await enterpriseHoldings(binding);
      return enterpriseOperations(binding, { agency: () => offices.agencyAt(offices.agencyRootOf(binding)), store,
        handedAgency: () => offices.handedAgency(binding), deedsOf: offices.boardDeedsOf(binding), testimony: () => offices.bearerTestimonyOf(binding), procedures: { "land-contracts": land.LAND_PROCEDURE, "heir-search": heir.HEIR_PROCEDURE, "structural-claims-register": claims.CLAIMS_PROCEDURE, "us-representation": representation.REPRESENTATION_PROCEDURE }, holds: (subject, office) => offices.officesOfAccount(binding, subject).some((held) => held.office === office || held.office.endsWith(`#${office}`)) });
    }
    case "@red-cup-engineering/metroplat/run-causal-set": return (await import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/run-causal-set")).runCausalSetOperations(binding);
    case "@red-cup-engineering/metroplat/session-presence": return (await import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/session-presence")).sessionPresenceOperations(binding);
    case "@red-cup-engineering/metroplat/learning": {
      const [{ learningOperations }, { claudeTranscriptDirectory, readUtterances }, { repositoryRootOf }] = await Promise.all([import("@red-cup-engineering/knowing/learning"), import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/utterances"), import("@red-cup-engineering/metroplat/offices")]);
      const transcripts = [claudeTranscriptDirectory(repositoryRootOf(binding))];
      const carrierCache = (directory) => path.join(homedir(), ".local", "state", "561-group", "knowing", `${path.basename(directory)}.prompts.json`);
      return learningOperations({ dataRoot: binding.dataRoot, utterances: (window) => readUtterances({ root: binding.dataRoot, transcripts, codex: [path.join(homedir(), ".codex", "history.jsonl")], cache: carrierCache, ...window }, binding) });
    }
    case "@red-cup-engineering/metroplat/directory-readout": return (await import("@red-cup-engineering/knowledge-system-server/directory-readout")).directoryReadoutOperations(binding);
    case "@red-cup-engineering/metroplat/file-census": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/file-census/service")).fileCensusOperations(binding);
    case "@red-cup-engineering/metroplat/lexicon-census": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/source-code/lexicon/service")).lexiconCensusOperations(binding);
    case "@red-cup-engineering/metroplat/term-catalog": return (await import("@red-cup-engineering/communicating/language/catalog-operations")).termCatalogOperations(binding);
    case "@red-cup-engineering/metroplat/eavt-cell": return (await import("@red-cup-engineering/knowledge-system-server/eavt-cell")).eavtCellOperations(binding);
    case "@red-cup-engineering/metroplat/capability-assertions": return (await import("@red-cup-engineering/metroplat/operations/capability")).capabilityAssertionOperations(binding);
    case "@red-cup-engineering/metroplat/legibility": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/legibility/service")).legibilityOperations(binding);
    case "@red-cup-engineering/metroplat/module-cohesion": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/operations")).moduleCohesionOperations(binding);
    case "@red-cup-engineering/metroplat/module-topology": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/operations")).moduleTopologyOperations(binding);
    case "@red-cup-engineering/metroplat/source-code-policy": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/operations")).sourceCodePolicyOperations(binding);
    case "@red-cup-engineering/metroplat/checkout-health": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/checkout-health/service")).checkoutHealthFamilyOperations(binding);
    case "@red-cup-engineering/metroplat/path-corpus": return (await import("@red-cup-engineering/knowledge-system-server/search/path-corpus")).pathCorpusOperations(binding);
    case "@red-cup-engineering/metroplat/archive": return (await import("@red-cup-engineering/knowledge-system-server/search/revision-index")).revisionIndexOperations(binding);
    case "@red-cup-engineering/metroplat/proof-play": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/proof-play/service")).proofPlayOperations(binding);
    case "@red-cup-engineering/metroplat/schema-conformance": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/schema-conformance/service")).schemaConformanceOperations(binding);
    case "@red-cup-engineering/metroplat/term-intension": return (await import("@red-cup-engineering/knowledge-system-server/search/service")).termIntensionOperations(binding);
    case "@red-cup-engineering/metroplat/duty-worktree": return (await import("@red-cup-engineering/metroplat/offices")).dutyWorkspaceOperations(binding);
    case "@red-cup-engineering/metroplat/workspace-git": return (await import("@red-cup-engineering/computer-code-development-engine/git/operations")).gitWorkspaceOperations(binding);
    case "@red-cup-engineering/metroplat/workspace-graph": return (await import("@red-cup-engineering/computer-code-development-engine/monitoring/operations")).workspaceGraphOperations(binding);
    case "@red-cup-engineering/metroplat/workspace-readout": return (await import("@red-cup-engineering/computer-code-development-engine/workspace/readout")).workspaceReadoutOperations(binding);
    default: throw new TypeError(`unknown MetroPlat operation family ${JSON.stringify(module)}`);
  }
}

/** The installed accounting surface uses the same enterprise-bound families as direct calls. Each
 *  operation is advertised from its generated descriptor and its family is built on first call:
 *  the three ledger families (some 300 modules, ethers among them) stay unloaded until a ledger
 *  verb runs. */
export async function accountingOperations(binding) {
  // Read when the surface is built, never at import: the descriptor generator imports this module
  // to load each family, so a static import of its own output could not resolve before it runs.
  const { operationFamilyDescriptors } = await import("./generated/operation-family-descriptors.mjs");
  const modules = [
    "@red-cup-engineering/metroplat/ledger",
    "@red-cup-engineering/metroplat/ledger-maintenance",
    "@red-cup-engineering/metroplat/energy-accounting",
  ];
  return Object.freeze(modules.flatMap((module) => {
    let loaded;
    const load = () => loaded ??= loadOperationFamily(module, binding);
    return operationFamilyDescriptors[module].map((descriptor) => lazyOperation(descriptor, load));
  }));
}
