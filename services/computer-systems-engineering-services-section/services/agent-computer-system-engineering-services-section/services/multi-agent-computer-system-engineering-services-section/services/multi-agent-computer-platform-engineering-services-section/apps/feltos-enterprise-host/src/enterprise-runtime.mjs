import {actorSubjectAtHost,createEnterpriseActorMesh} from './actor-mesh.mjs';
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { agencyAt } from "@red-cup-engineering/metroplat/offices";
import { enterpriseRootOf, settlementsRootOf } from "@red-cup-engineering/organizing/enterprise";
import { enterpriseOfficeKeys, seatedEnterprises, staffedByOwnOffices } from "@red-cup-engineering/feltos/work/enterprise-loop";
import { firmPoolAuthorityResolver } from "@red-cup-engineering/metroplat/firm-pool-authority";
import { homeHostOf, hostedWorkIntentAdmission, hostedWorkOpening, hostedWorkTelling } from "./federated-work.mjs";
import { hostedCharacterCommunication } from "./character-communication.mjs";
import { enterpriseAgencyWorkOptions } from "./agency-work.mjs";
import { conurbationOperations } from "./conurbation-readout.mjs";
import { workReplicationOperations } from "./work-replication.mjs";
import { enterpriseLoopOperations, enterpriseLoopSchedules } from "./enterprise-loops.mjs";

/** The one installed MetroPlat operation surface used by both request dispatch and clock work. */
export function enterpriseOperationRuntime({ installed, config, environment, activityPubProvider = () => undefined, activityPubInbox = () => undefined, openWork: hostOpenWork, executeIsolatedWork, replicationTransport, sourceWorkspaces, sourceReadResource }) {
  const schedules = [
    ...(installed.schedules ?? []),
    ...enterpriseLoopSchedules({ agency: agencyAt(config.agencyRoot), host: config.activityPub?.nodeHost ?? installed.identity.id, account: installed.identity.id }),
  ];
  const nodeHost = config.activityPub?.nodeHost ?? installed.identity.id;
  const resolveActorSubject=subject=>actorSubjectAtHost(config,subject);
  const binding = defaultFilesystemBinding(config.metroplatDataRoot,{agencyRoot:config.agencyRoot,repositoryRoot:config.repositoryRoot,resolveActorSubject,sourceReadResource,
    sourceTaskOf: (scope, identity, execution) => { if (typeof hostedWork?.sourceTaskOf !== "function") throw new TypeError("source task: native work binding unavailable"); return hostedWork.sourceTaskOf(scope, identity, execution); } });
  // Private host services, supplied by the actual source owner, never operation/instance input.
  const sourcePorts = sourceWorkspaces === undefined ? {} : sourceWorkspaces;
  const sourceKeys = ["prepareSourceBinding", "sourceBindingOf", "bindSourceGit", "publishSourceCandidate", "sourcePreparationOf"];
  if (sourceWorkspaces !== undefined && (sourcePorts === null || typeof sourcePorts !== "object" || Array.isArray(sourcePorts)
    || Object.keys(sourcePorts).some(key => !sourceKeys.includes(key))
    || sourceKeys.slice(0, 4).some(key => typeof sourcePorts[key] !== "function")
    || sourcePorts.sourcePreparationOf !== undefined && typeof sourcePorts.sourcePreparationOf !== "function")) throw new TypeError("source workspaces require their complete private owner binding");
  const heldSourcePorts = Object.freeze({ ...sourcePorts });
  let hostedWork;
  let hostedSurface;
  let hostWorkOptions;
  const heldRealms = new WeakMap();
  const resolveWorkRealm = (enterprise) => {
    if (typeof enterprise !== "string" || enterprise.length === 0) throw new TypeError("enterprise work: a canonical enterprise id is required");
    const agency = agencyAt(config.agencyRoot);
    const records = seatedEnterprises(agency, config.activityPub?.nodeHost ?? installed.identity.id).filter(record => record.id === enterprise);
    if (records.length !== 1) throw new TypeError("enterprise work: enterprise is absent, ambiguous or not seated on this host");
    const record = records[0];
    if (heldRealms.has(record)) return heldRealms.get(record);
    const root = enterpriseRootOf(record, { settlementsRoot: settlementsRootOf(environment), repositoryRoot: config.repositoryRoot });
    let options;
    const own = root === binding.dataRoot ? binding : defaultFilesystemBinding(root, { agencyRoot:config.agencyRoot,repositoryRoot:config.repositoryRoot,resolveActorSubject,sourceReadResource,
      sourceTaskOf: (scope, identity, execution) => { if (typeof options?.sourceTaskOf !== "function") throw new TypeError("source task: native enterprise binding unavailable"); return options.sourceTaskOf(scope, identity, execution); } });
    options = enterpriseAgencyWorkOptions({ ...hostWorkOptions, workBinding: own, enterprise: record.id });
    const officeKeys = enterpriseOfficeKeys(agency, record);
    const realm = Object.freeze({ binding: own, officeKeys, options: Object.freeze({
      ...options, workEnterprise: record.id, demandAssessment: record.assesses,
      readAllocationAuthorities: staffedByOwnOffices(options.readAllocationAuthorities, enterpriseOfficeKeys(agency, record)),
      resolveAgencyWorkAuthority: firmPoolAuthorityResolver({ firmPoolRoot: config.agencyRoot }, own),
    }) });
    heldRealms.set(record, realm);
    return realm;
  };
  const openWork = hostOpenWork ?? hostedWorkOpening({ config, binding, provider: activityPubProvider });
  const enterpriseLoops = enterpriseLoopOperations({
    binding,
    host: config.activityPub?.nodeHost ?? installed.identity.id,
    agencyRoot: config.agencyRoot,
    repositoryRoot: config.repositoryRoot,
    releaseRoot: config.releaseRoot,
    settlementsRoot: settlementsRootOf(environment),
    workOptions: () => hostedWork,
    operations: () => hostedSurface?.()?.operations ?? [],
    open: openWork,
    tell: hostedWorkTelling({ config, binding, provider: activityPubProvider, host: nodeHost, enterprises: () => [...agencyAt(config.agencyRoot).enterprises.values()] }),
    executeIsolatedWork,
  });
  return Object.freeze({
    binding,
    openWork,
    schedules: Object.freeze(schedules),
    operationSources: Object.freeze([
      Object.freeze({ module: "@red-cup-engineering/feltos-enterprise-host/conurbation-readout", operations: conurbationOperations(binding) }),
      Object.freeze({ module: "@red-cup-engineering/feltos-enterprise-host/enterprise-loops", operations: enterpriseLoops }),
      Object.freeze({ module: "@red-cup-engineering/feltos-enterprise-host/work-replication", operations: workReplicationOperations({ config, binding, provider: activityPubProvider, host: nodeHost, executeIsolatedWork, ...replicationTransport }) }),
    ]),
    createWorkOptions: (options) => {
      hostWorkOptions = { ...Object.fromEntries(Object.entries(options).filter(([key]) => !sourceKeys.includes(key))), ...heldSourcePorts };
      hostedSurface = options.operationSurface;
      const admitWorkIntent = hostedWorkIntentAdmission({ config, binding, resolveWorkRealm });
      return hostedWork = Object.freeze({
        ...enterpriseAgencyWorkOptions(hostWorkOptions),
        resolveActorSubject,agencyRoot:config.agencyRoot,
        ...(config.activityPub?.nodeHost===undefined?{}:{actorMesh:createEnterpriseActorMesh({config,binding,provider:activityPubProvider,inbox:activityPubInbox})}),
        resolveWorkRealm,
        environment: options.environment,
        instanceIdentity: options.identity,
        characterCommunication: hostedCharacterCommunication({ config, binding, provider: activityPubProvider }),
        demandAssessment: installed.applications.find((application) => application.configuration?.demandAssessment !== undefined)?.configuration.demandAssessment,
        admitWorkIntent,
        isHeldWorkIntent: admitWorkIntent.isHeldWorkIntent,
      });
    },
  });
}
