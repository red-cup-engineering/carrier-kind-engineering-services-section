import { readFileSync } from "node:fs";
import { join } from "node:path";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { guardOperators, isOperator } from "@red-cup-engineering/metroplat-operations-console/people";
import { currentPeerEvidence } from "@red-cup-engineering/feltos/peer-evidence";
import { projectCloudResourceClaims } from "@red-cup-engineering/computer-system-platform/cloud-resource-claims";
import { validateComputeObservationPolicy } from "@red-cup-engineering/computer-system-platform/compute-observation";
import { createCausalResourceHead } from "@red-cup-engineering/semiotic-eavt-services-section/causal-resource-head";

const validComputeRecord = (record, policy) => record?.kind === policy.recordKind
  && typeof record.observedAt === "string" && Number.isFinite(Date.parse(record.observedAt))
  && Array.isArray(record.googleCloud?.projects) && Array.isArray(record.credentials);
// One stable validator per admitted configuration; FeltOS also revalidates hits.
const validators = new WeakMap();
function evidenceValidator(policy) {
  if (!validators.has(policy)) validators.set(policy, value => value?.type === policy.valueType
    && value.asOf === value.record?.observedAt && validComputeRecord(value.record, policy));
  return validators.get(policy);
}

/** The configured dated compute observation (Google Cloud, Oracle Cloud, Cloudflare, machines and
 * credential locations, never credential values), refreshed by the configured
 * compute resource operation before placement decisions. */
export function readComputeRecord(computeRecordPath, policy) {
  const record = JSON.parse(readFileSync(computeRecordPath, "utf8"));
  if (!validComputeRecord(record, policy)) {
    throw new TypeError("compute resource observation is invalid");
  }
  return record;
}

export function currentComputeRecord({ config, authorActor, policy }) {
  if (new URL(authorActor).origin === new URL(config.publicBaseUrl).origin) {
    return readComputeRecord(join(config.dataDir, policy.recordFile), policy);
  }
  const evidence = currentPeerEvidence({
    config, authorActor, objectKind: policy.objectKind,
    validValue: evidenceValidator(policy),
  });
  return evidence?.record ?? null;
}

/** The configured dated compute observation, local at its author and federated at its peer. */
export function computeObservationView({ config, configuration }) {
  const policy = validateComputeObservationPolicy(configuration?.policy);
  if (!Array.isArray(configuration.navigationLinks) || configuration.navigationLinks.some(
    link => typeof link?.href !== 'string' || typeof link?.label !== 'string'))
    throw new TypeError('compute navigation requires explicit links');
  const navigation = Object.assign(configuration.navigationLinks.map(link => ({...link})), {title: configuration.label});
  const head = createCausalResourceHead({recordType: policy.resourceRecordType,
    witnessType: policy.witnessType, event: policy.event});
  const authorActor = configuration.computeAuthorActor;
  if (typeof authorActor !== "string" || new URL(authorActor).protocol !== "https:") {
    throw new TypeError("Compute observation requires its author actor");
  }
  const readCompute = () => currentComputeRecord({ config, authorActor, policy });
  const mayReadCompute = (context) => {
    const claims = context?.principal;
    return isOperator(claims === undefined ? null : { provider: "bearer", subjectHash: claims.subject, label: claims.principal?.name ?? claims.subject },
      { stateDir: config.stateDir, allowedEmail: config.allowedEmail });
  };
  const resources = [
    {
      id: "ops-control-plane.compute",
      match: "/compute",
      methods: ["GET"],
      produces: ["application/json"],
      handler: () => {
        let record;
        try { record = readCompute(); }
        catch (error) {
          if (error?.code === "ENOENT") return jsonRepr({ error: "compute_inventory_unavailable", reason: "Refresh the compute resource observation" }, { status: 503, cacheControl: { noStore: true } });
          return jsonRepr({ error: "compute_inventory_invalid" }, { status: 502, cacheControl: { noStore: true } });
        }
        if (record === null) return jsonRepr({ error: "compute_inventory_unavailable", reason: "No admitted observation from the author instance" }, { status: 503, cacheControl: { noStore: true } });
        return jsonRepr({ ...record, resourcePredications: projectCloudResourceClaims(record, policy) }, { cacheControl: { noStore: true } });
      },
    },
    {
      id: "ops-control-plane.compute-resource-cells",
      match: "/compute/resources",
      methods: ["GET"],
      produces: ["application/json"],
      handler: () => {
        let record;
        try { record=readCompute(); }
        catch { return jsonRepr({error:"compute_resource_evidence_unavailable"},
          {status:503,cacheControl:{noStore:true}}); }
        if(record===null)return jsonRepr({error:"compute_resource_evidence_unavailable"},
          {status:503,cacheControl:{noStore:true}});
        return jsonRepr(projectCloudResourceClaims(record, policy),
          {cacheControl:{noStore:true}});
      },
    },
  ];
  const tools = [Object.freeze({
    name: "compute_resources",
    description: "Read the dated observations of Google Cloud, Oracle Cloud, Cloudflare, machines, and credential locations before selecting compute for work.",
    inputSchema: { type: "object", additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    visible: mayReadCompute,
    handler: (_input, context) => {
      if (!mayReadCompute(context)) throw new Error("compute resources require an operator");
      const record = readCompute();
      if (record === null) throw new Error("No admitted compute observation from the author instance");
      return { ...record, resourcePredications: projectCloudResourceClaims(record, policy) };
    },
  }),Object.freeze({
    name: "compute_resource",
    description: "Read one cloud compute or data resource at its stable SCA ni: subject, from the installed native SEAVT store or the last authenticated signed peer observation.",
    inputSchema: {type:"object",required:["subject"],properties:{subject:{type:"string"}},additionalProperties:false},
    annotations: {readOnlyHint:true,idempotentHint:true,openWorldHint:false},
    visible: mayReadCompute,
    handler: ({subject},context) => {
      if(!mayReadCompute(context))throw new Error("cloud resource requires an operator");
      if(typeof subject!=="string"||!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(subject))
        throw new TypeError("an exact SCA ni: resource subject is required");
      if(new URL(authorActor).origin===new URL(config.publicBaseUrl).origin) {
        const reading = head.read(config.dataDir,subject);
        return reading === null
          ? {kind:policy.currentKind,subject,state:"unobserved-in-native-store"}
          : {...reading,kind:policy.currentKind};
      }
      // A signed peer reading is useful, but cannot be misreported as a
      // locally committed native SEAVT resource head. Never mutate a
      // read-only MCP request to install remote claims.
      const record=readCompute();
      if(record===null)return {kind:policy.currentKind,subject,state:"peer-observation-unavailable"};
      const facts=projectCloudResourceClaims(record, policy);
      const index=facts.resourceSubjects.indexOf(subject);
      return index<0
        ? {kind:policy.currentKind,subject,state:"unobserved-in-signed-peer"}
        : {kind:policy.currentKind,subject,
            state:"signed-peer-projection-not-locally-stored",asOf:facts.asOf,
            sourceCommitment:facts.sourceCommitment,observation:facts.rows[index]};
    },
  })];
  return { tools, applications: [guardOperators({ resources }, () => true, {
    stateDir: config.stateDir, allowedEmail: config.allowedEmail,
    navigation, navigationTitle: navigation.title,
  })] };
}
