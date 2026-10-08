import { controlPlaneApp } from "./control-plane.mjs";
import { libraryApp } from "./library.mjs";
import { worldClientApp } from "./world-client.mjs";
import { obligationsApp } from "./obligations.mjs";
import { guardOperators, peopleApp } from "./people.mjs";
import { syncGitHubIssues } from "./github-issues.mjs";

/** An installed operations console. The instance supplies identity, roots and
 * policy; the platform supplies admission and the operation caller. */
export function operationsConsole({ config, configuration = {}, run, runAs, resolveGitHubReceivingBinding }) {
  const label = configuration.label ?? config.instance.label ?? config.instance.title;
  const githubSource = configuration.githubIssueSources?.[config.instance.name];
  // The house's work is held across many repositories; a source names them as owner/name or owner/*.
  const federates = (repository) => (githubSource?.repositories ?? []).some((pattern) => {
    const [owner, name] = pattern.toLowerCase().split("/"), [rOwner, rName] = repository.toLowerCase().split("/");
    return owner === rOwner && (name === "*" || name === rName);
  });
  const navigation = [
    { href: "/play", label: "Play" }, { href: "/network", label: "Network" },
    { href: "/tasks/view", label: "Work" }, { href: "/books/view", label: "Books" },
    ...(configuration.navigationLinks ?? []),
    { href: "/obligations", label: "Obligations" }, { href: "/people", label: "People" },
  ];
  const obligations = obligationsApp({ stateDir: config.stateDir, sources: configuration.obligationSources ?? [], runAs, navigation, navigationTitle: label });
  return {
    tools: [{
      name: "ops_open_work",
      description: "Open a thread on the work board under your authenticated identity, as the office you name with as (or the one office you hold): an aim (purpose that never finishes, with measures), a request (need; requirements as shall statements with class, priority and rationale; conditions of satisfaction naming the requirements they verify and how), a report (observation of a broken law, named by law and subject so the same condition is one thread), a proposal (idea), a question, or a declaration (ruling: a decision you make within your own authority, which is neither work nor a finding and stands until you withdraw or supersede it). Decide with declare, not report; report only what is observed. Decompose work with serves (the request or aim this is part of) and order it with after; scope section:<path> names the part of the house it is about, from which its home micro-enterprise is derived. Corrections supersede your own earlier threads. Never name who or which model does the work; whoever promises it staffs it. Same content, same thread.",
      inputSchema: {
        type: "object", required: ["move"],
        properties: {
          move: { enum: ["aim", "request", "report", "propose", "ask", "declare"] }, as: { type: "string" },
          purpose: { type: "string" }, measures: { type: "array" },
          need: { type: "string" }, observation: { type: "string" }, idea: { type: "string" }, question: { type: "string" }, ruling: { type: "string" },
          rationale: { type: "string" }, law: { type: "string" }, subject: { type: "string" },
          serves: { type: "array", items: { type: "string" } }, after: { type: "array", items: { type: "string" } },
          requirements: { type: "array" }, conditions: { type: "array" }, evidence: { type: "array", items: { type: "string" } },
          scope: { type: "array", items: { type: "string" } }, tags: { type: "array", items: { type: "string" } },
          horizon: { enum: ["soon", "later", "someday"] }, to: { type: "string" }, assayer: { type: "string" },
          supersedes: { type: "array", items: { type: "string" } }, relates: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
      admitArguments: false,
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
      handler: (args, context) => {
        const producer = context?.principal?.subject;
        if (typeof producer !== "string" || !producer) throw new TypeError("sign in to open work");
        return runAs(producer, "work-open", args);
      },
    }, ...(githubSource === undefined ? [] : [{
      name: "ops_sync_github_issues",
      description: "Play a house repository's GitHub issues onto the work board as reports under your identity: each issue is one report under law github-issue-open with the issue URL as its subject (words as the observation, labels as tags, comments as evidence, the snapshot committed in its source); an edited issue corroborates it with the new snapshot (reopening it if resolved), a closed one resolves it, and an issue already carried by other work (a request citing it as a source) opens nothing until it changes. Old closed issues open nothing. A report obliges nobody: an enterprise adopts it into a request it holds, and GitHub closure never accepts that work. Pass issueNumbers to reconcile a bounded set of issue numbers; omit it to scan the repository. Returns the moves played, not source bodies; read work-board with thread=<id> for the report.",
      inputSchema: { type: "object", required: ["repository"], properties: { repository: { type: "string", pattern: "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$" }, as: { type: "string", minLength: 1 }, issueNumbers: { type: "array", minItems: 1, maxItems: 50, uniqueItems: true, items: { type: "integer", minimum: 1 } } }, additionalProperties: false },
      admitArguments: false,
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
      handler: (args, context) => {
        const producer = context?.principal?.subject;
        if (typeof producer !== "string" || !producer) throw new TypeError("sign in to synchronize GitHub reports");
        if (!federates(args.repository)) throw new TypeError(`${args.repository} is not among this instance's GitHub issue sources`);
        return syncGitHubIssues({ repository: args.repository, producer, office: args.as, issueNumbers: args.issueNumbers,
          runAs, token: process.env.METROPLAT_GITHUB_TOKEN, tokenCommand: githubSource.tokenCommand,
          ...(resolveGitHubReceivingBinding === undefined ? {} : { resolveReceivingBinding: ({ repository, repositoryRecord }) =>
            resolveGitHubReceivingBinding({ repository, repositoryRecord, subject: producer, office: args.as }) }) });
      },
    }])],
    rootRoutes: [
      { id: "operations.work", match: "/work", methods: ["GET"], handler: () => ({ status: 303, headers: { location: "/tasks/view" }, cacheControl: { noStore: true } }) },
    ],
    applications: [
      guardOperators(controlPlaneApp(config.dataDir, { run, runAs, navigationTitle: label, navigationLinks: configuration.navigationLinks ?? [] }),
        (resource) => /^ops-control-plane\.(books|records?|world|businesses|group-financial-readout)/u.test(resource.id),
        { stateDir: config.stateDir, allowedEmail: config.allowedEmail, navigation, navigationTitle: label }),
      peopleApp({ stateDir: config.stateDir, allowedEmail: config.allowedEmail, navigation, navigationTitle: label }),
      { resources: obligations.resources },
      worldClientApp({ title: config.instance.title ?? label, navigation, navigationTitle: label, run, runAs, landing: obligations.landing }),
      libraryApp({ dataRoot: config.metroplatDataRoot }),
    ],
  };
}
