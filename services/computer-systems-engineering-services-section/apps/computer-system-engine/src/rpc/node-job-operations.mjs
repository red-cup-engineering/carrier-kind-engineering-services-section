import { operation } from "./operation.mjs";
import { openingOf } from "@red-cup-engineering/organizing/enterprise";
import { nodeJobReadings, nodeJobSchedulesOf, nodeJobsAt, runNodeJob } from "@red-cup-engineering/node-job-service";

const DEPLOYMENT = /^[a-z0-9][a-z0-9-]*$/;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Bind the admitted Operations parameter data to the existing Code job owner.
 * The instance declaration is resolved before this factory is called; this Systems
 * adapter never rereads instance files or discovers deployments from a directory.
 */
export function nodeJobConfigurationsOf({ law, deploymentRecords } = {}) {
  if (typeof law !== "string" || law.trim() === "" || !Array.isArray(deploymentRecords) || deploymentRecords.length === 0) {
    throw new TypeError("node-job: admitted law and deployment records are required");
  }
  const selected = new Set();
  const records = deploymentRecords.map((entry) => {
    if (!record(entry)
      || Object.keys(entry).some(key => !["deployment", "host", "scope", "jobConfiguration"].includes(key))
      || typeof entry.deployment !== "string" || !DEPLOYMENT.test(entry.deployment) || selected.has(entry.deployment)
      || typeof entry.host !== "string" || entry.host.trim() === ""
      || !Array.isArray(entry.scope) || entry.scope.length > 64
      || entry.scope.some(term => typeof term !== "string" || term.trim() === "" || term.length > 2048)
      || new Set(entry.scope).size !== entry.scope.length
      || !record(entry.jobConfiguration)) {
      throw new TypeError("node-job: each admitted deployment needs a unique identity, host, authored scope terms, and job configuration");
    }
    const jobConfiguration = Object.freeze({ ...entry.jobConfiguration });
    nodeJobsAt(jobConfiguration);
    selected.add(entry.deployment);
    return Object.freeze({ deployment: entry.deployment, host: entry.host,
      scope: Object.freeze([...entry.scope]), jobConfiguration });
  });
  return Object.freeze({ law, deploymentRecords: Object.freeze(records) });
}

/** The existing Code provider owns trigger derivation and execution. Systems
 * composes that provider with the installed instance and its operation protocol. */
export function nodeJobSchedules(parameterData, { account } = {}) {
  const { deploymentRecords } = nodeJobConfigurationsOf(parameterData);
  return Object.freeze(deploymentRecords.flatMap(({ deployment, jobConfiguration }) =>
    nodeJobSchedulesOf({ configuration: jobConfiguration, deployment, account, home: "/" })));
}

const jobTag = (deployment, job) => `node-job-${deployment}-${job}`;
function endingOf(run, job) {
  if (run.result === "timeout") return `ran past its ${job.maxSeconds}s limit`;
  if (run.result === "exit-code") return `exited ${run.exit?.status}`;
  if (run.result === "signal" || run.result === "core-dump") return `was killed by ${run.exit?.status}`;
  return `ended ${run.result}`;
}

/** Findings retain the data-owned law, authored scope, host provenance and bounded text.
 * An unrun job remains unmeasured. */
export function nodeJobFindingsOf({ poster, law, deploymentRecords } = {}) {
  if (typeof poster !== "string" || !poster) {
    throw new TypeError("node-job-findings: poster is required");
  }
  const admitted = nodeJobConfigurationsOf({ law, deploymentRecords });
  const readings = admitted.deploymentRecords.flatMap(({ deployment, host, scope, jobConfiguration }) =>
    nodeJobReadings({ configuration: jobConfiguration, home: "/" }).map(reading => ({ deployment, host, scope, ...reading })));
  const read = readings.filter(({ last }) => last !== undefined);
  return Object.freeze({
    kind: "node-job-findings.v1", poster,
    domain: Object.freeze({ tags: Object.freeze(read.map(({ deployment, job }) => jobTag(deployment, job.id))) }),
    evidence: readings.map(({ deployment, host, job, last }) => "node-job:" + deployment + ":" + job.id + "@" + host + "=" + (last === undefined ? "unrun" : last.result + "@" + last.endedAt)).join("; "),
    openings: Object.freeze(read.filter(({ last }) => last.ok !== true).map(({ deployment, host, scope, job, receipt, last }) => {
      const said = `The ${job.id} job on ${deployment} (${host}) ${endingOf(last, job)} at ${last.endedAt}, running release ${last.release ?? "unknown"}`;
      const tail = (last.tail ?? []).slice(-6).join(" | ");
      return { deployment, host, job: job.id, opening: openingOf({
        move: "report", by: poster, law: admitted.law, subject: `node-job:${deployment}:${job.id}`,
        observation: `${said}${tail === "" ? "." : `: ${tail}`}`.slice(0, 800), evidence: [receipt],
        scope, tags: [jobTag(deployment, job.id)], at: last.endedAt,
      }) };
    })),
  });
}

export function nodeJobOperations(binding, installedOperationOptions = {}) {
  const ownSources = () => nodeJobConfigurationsOf(installedOperationOptions.configuration);
  return Object.freeze([
    operation({
      verb: "node-job-run", inputFormat: "json", outputFormat: "json",
      summary: "Start the next run of a job declared by this installed instance.",
      description: "Domain: { deployment, job }. Installed native declarations supply runtime, artifact, state and unit identity. The existing Code executor starts the released program and retains its receipt; request input never chooses executable bytes or host paths.",
      reads: ["node-job"], writes: ["node-job"],
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: input => {
        const selected = ownSources().deploymentRecords.find(source => source.deployment === input?.deployment);
        if (!selected) throw new TypeError("node-job: the requested deployment is not selected by this instance");
        const workingTree = installedOperationOptions.environment?.METROPLAT_CODEX_WORKSPACE ?? binding?.repositoryRoot;
        return runNodeJob({ configuration: selected.jobConfiguration, job: input?.job, home: "/",
          ...(workingTree === undefined ? {} : { workingTree }),
          ...(installedOperationOptions.node === undefined ? {} : { node: installedOperationOptions.node }),
          ...(installedOperationOptions.credentialsDirectory === undefined ? {} : { credentialsDirectory: installedOperationOptions.credentialsDirectory }),
          ...(binding?.now === undefined ? {} : { now: () => new Date(binding.now()) }),
        });
      },
    }),
    operation({
      verb: "node-job-findings", inputFormat: "json", outputFormat: "json",
      summary: "Derive the job law's reports from the installed instance's receipts.",
      description: "Domain: { poster }. Read installed job declarations and their last receipts. Report unsuccessful measured runs with their original law, authored scope terms and receipt evidence; leave missing receipts unmeasured.",
      reads: ["node-job"],
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
      run: input => nodeJobFindingsOf({ poster: input?.poster, ...ownSources() }),
    }),
  ]);
}
