import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { operation } from "./operation.mjs";
import { openingOf } from "@red-cup-engineering/organizing/enterprise";
import { nodeJobReadings, nodeJobSchedulesOf, nodeJobsAt, runNodeJob } from "@red-cup-engineering/node-job-service";

const MODULE = "@red-cup-engineering/computer-system-engine/rpc/node-job-operations";
const DEPLOYMENT = /^[a-z0-9][a-z0-9-]*$/;
export const NODE_JOB_LAW = "A node runs each job its deployment declares from its released bytes, and each run ends in success.";

/** Read host-selected declarations through the admitted factory context. RPC input
 * cannot supply an instance, runtime, state root, command or credential path. */
export function nodeJobConfigurationsOf({ environment = {}, processConfig = {}, instanceIdentity } = {}) {
  const instancePath = environment.METROPLAT_INSTANCE ?? processConfig.instance;
  if (typeof instancePath !== "string" || !isAbsolute(instancePath)
      || typeof instanceIdentity?.id !== "string" || !instanceIdentity.id
      || typeof instanceIdentity.title !== "string" || !instanceIdentity.title.trim()) {
    throw new TypeError("node-job: an installed instance and its admitted identity are required");
  }
  if (processConfig.instance !== undefined && (typeof processConfig.instance !== "string" || !isAbsolute(processConfig.instance))) {
    throw new TypeError("node-job: the installed instance path must be absolute");
  }
  if (environment.METROPLAT_INSTANCE !== undefined && processConfig.instance !== undefined
      && resolve(environment.METROPLAT_INSTANCE) !== resolve(processConfig.instance)) {
    throw new TypeError("node-job: the installed instance differs from process options");
  }
  const instance = JSON.parse(readFileSync(instancePath, "utf8"));
  if (instance?.version !== 1 || typeof instance.instanceOf !== "string"
      || ["id", "title", "origin"].some(key => instance.identity?.[key] !== instanceIdentity[key])
      || !Array.isArray(instance.scheduleSources)) {
    throw new TypeError("node-job: the installed declaration differs from the admitted instance");
  }
  const selected = new Set(), configurations = [];
  for (const source of instance.scheduleSources) {
    if (source?.module !== MODULE || source.export !== "nodeJobSchedules") continue;
    const deployment = source.configuration?.deployment;
    if (typeof deployment !== "string" || !DEPLOYMENT.test(deployment) || selected.has(deployment)) {
      throw new TypeError("node-job: each installed deployment selection must be distinct and valid");
    }
    const configuration = source.configuration.jobConfiguration;
    nodeJobsAt(configuration);
    selected.add(deployment);
    configurations.push(Object.freeze({ deployment, configuration: Object.freeze({ ...configuration }), home: "/" }));
  }
  if (!configurations.length) throw new TypeError("node-job: this instance declares no native job configurations");
  return Object.freeze(configurations);
}

/** The existing Code provider owns trigger derivation and execution. Systems
 * composes that provider with the installed instance and its operation protocol. */
export function nodeJobSchedules({ deployment, jobConfiguration } = {}, { account } = {}) {
  if (typeof deployment !== "string" || !DEPLOYMENT.test(deployment)) {
    throw new TypeError("node-job: a valid deployment selection is required");
  }
  nodeJobsAt(jobConfiguration);
  return nodeJobSchedulesOf({ configuration: jobConfiguration, deployment, account, home: "/" });
}

function sectionOf(directory) {
  const parts = directory.split("/"), group = parts.indexOf("561-group");
  if (group === -1) return [];
  let end = group + 1;
  while (parts[end] === "services" && parts[end + 1] !== undefined) end += 2;
  return end === group + 1 ? [] : [`section:${parts.slice(group + 1, end).join("/")}`];
}

const jobTag = (deployment, job) => `node-job-${deployment}-${job}`;
function endingOf(run, job) {
  if (run.result === "timeout") return `ran past its ${job.maxSeconds}s limit`;
  if (run.result === "exit-code") return `exited ${run.exit?.status}`;
  if (run.result === "signal" || run.result === "core-dump") return `was killed by ${run.exit?.status}`;
  return `ended ${run.result}`;
}

/** Findings retain the original law, scope, receipt evidence and bounded text.
 * An unrun job remains unmeasured; it does not acquire a failure or success. */
export function nodeJobFindingsOf({ poster, configurations }) {
  if (typeof poster !== "string" || !poster || !Array.isArray(configurations)) {
    throw new TypeError("node-job-findings: poster and installed configurations are required");
  }
  const readings = configurations.flatMap(({ deployment, ...selection }) =>
    nodeJobReadings(selection).map(reading => ({ deployment, ...reading })));
  const read = readings.filter(({ last }) => last !== undefined);
  return Object.freeze({
    kind: "node-job-findings.v1", poster,
    domain: Object.freeze({ tags: Object.freeze(read.map(({ deployment, job }) => jobTag(deployment, job.id))) }),
    evidence: readings.map(({ deployment, job, last }) => `node-job:${deployment}:${job.id}=${last === undefined ? "unrun" : `${last.result}@${last.endedAt}`}`).join("; "),
    openings: Object.freeze(read.filter(({ last }) => last.ok !== true).map(({ deployment, job, receipt, last }) => {
      const said = `The ${job.id} job on ${deployment} ${endingOf(last, job)} at ${last.endedAt}, running release ${last.release ?? "unknown"}`;
      const tail = (last.tail ?? []).slice(-6).join(" | ");
      return { deployment, job: job.id, opening: openingOf({
        move: "report", by: poster, law: NODE_JOB_LAW, subject: `node-job:${deployment}:${job.id}`,
        observation: `${said}${tail === "" ? "." : `: ${tail}`}`.slice(0, 800), evidence: [receipt],
        scope: sectionOf(job.directory), tags: [jobTag(deployment, job.id)], at: last.endedAt,
      }) };
    })),
  });
}

export function nodeJobOperations(binding, context = {}) {
  const ownSources = () => nodeJobConfigurationsOf(context);
  return Object.freeze([
    operation({
      verb: "node-job-run", inputFormat: "json", outputFormat: "json",
      summary: "Start the next run of a job declared by this installed instance.",
      description: "Domain: { deployment, job }. Installed native declarations supply runtime, artifact, state and unit identity. The existing Code executor starts the released program and retains its receipt; request input never chooses executable bytes or host paths.",
      reads: ["node-job"], writes: ["node-job"],
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: input => {
        const selected = ownSources().find(source => source.deployment === input?.deployment);
        if (!selected) throw new TypeError("node-job: the requested deployment is not selected by this instance");
        const workingTree = context.environment?.METROPLAT_CODEX_WORKSPACE ?? binding?.repositoryRoot;
        return runNodeJob({ ...selected, job: input?.job,
          ...(workingTree === undefined ? {} : { workingTree }),
          ...(context.node === undefined ? {} : { node: context.node }),
          ...(context.credentialsDirectory === undefined ? {} : { credentialsDirectory: context.credentialsDirectory }),
          ...(binding?.now === undefined ? {} : { now: () => new Date(binding.now()) }),
        });
      },
    }),
    operation({
      verb: "node-job-findings", inputFormat: "json", outputFormat: "json",
      summary: "Derive the job law's reports from the installed instance's receipts.",
      description: "Domain: { poster }. Read installed job declarations and their last receipts. Report unsuccessful measured runs with their original law, owning section and receipt evidence; leave missing receipts unmeasured.",
      reads: ["node-job"],
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
      run: input => nodeJobFindingsOf({ poster: input?.poster, configurations: ownSources() }),
    }),
  ]);
}
