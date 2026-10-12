import {actorSubjectAtHost,createEnterpriseActorMesh} from './actor-mesh.mjs';
import {hostedDevelopmentOperations,hostedDevelopmentRequestAt} from './software-development.mjs';
import {hostedWorkerWorldExecution} from './worker-world.mjs';
import {metroplatFilesystemBinding,requireMetroplatBinding} from "@red-cup-engineering/metroplat/mcp-binding";
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
export function enterpriseOperationRuntime({ installed, config, environment, activityPubProvider = () => undefined, activityPubInbox = () => undefined, openWork: hostOpenWork, executeIsolatedWork, replicationTransport, sourceWorkspaces, sourceReadResource, createBinding=metroplatFilesystemBinding, bindingOptions={}, requestOwnService:hostRequestOwnService, executeWorld:hostExecuteWorld }) {
  const schedules = [
    ...(installed.schedules ?? []),
    ...enterpriseLoopSchedules({ agency: agencyAt(config.agencyRoot), host: config.activityPub?.nodeHost ?? installed.identity.id, account: installed.identity.id }),
  ];
  const nodeHost = config.activityPub?.nodeHost ?? installed.identity.id;
  const resolveActorSubject=subject=>actorSubjectAtHost(config,subject);
  const localBinding=(root,extra={})=>requireMetroplatBinding(createBinding(root,{repositoryRoot:config.repositoryRoot,resolveActorSubject,agencyRoot:config.agencyRoot,sourceReadResource,...extra,...bindingOptions}),root);
  const workBindings=()=>[...new Set(seatedEnterprises(agencyAt(config.agencyRoot),nodeHost).map(record=>
    enterpriseRootOf(record,{settlementsRoot:settlementsRootOf(environment),repositoryRoot:config.repositoryRoot})))].map(root=>localBinding(root));
  const bind = (root,extra) => Object.freeze({...localBinding(root,extra),workBindings:()=>[localBinding(root,extra),...workBindings().filter(own=>own.dataRoot!==root)]});
  const binding = bind(config.metroplatDataRoot,{
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
    const own = root === binding.dataRoot ? binding : bind(root, {
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
  const ownServiceMesh=config.activityPub?.nodeHost===undefined?undefined:createEnterpriseActorMesh({config,binding,provider:activityPubProvider,inbox:activityPubInbox});
  const requestOwnService=hostRequestOwnService??(async request=>{
    if(!ownServiceMesh)throw new TypeError('enterprise service work requires a signed actor on this host');
    return ownServiceMesh.request(request.enterprise,request,{requestKey:`enterprise:${request.enterprise}:${request.verb}:${Math.floor(Date.parse(binding.now())/120000)}`});
  });
  const executeWorld=hostExecuteWorld??hostedWorkerWorldExecution({
    binding,config,realmOf:resolveWorkRealm,operations:()=>hostedSurface?.()?.operations??[],
    authorize:(invocation,operation,at)=>hostedSurface().authorize(invocation,operation,at),
    worker:environment.METROPLAT_AGENT_WORKER_MODEL===undefined?undefined:{
      character:environment.METROPLAT_AGENT_WORKER_ID??'infograph-worker',
      session:(environment.METROPLAT_AGENT_WORKER_ID??'infograph-worker')+'@'+installed.identity.id,
      model:environment.METROPLAT_AGENT_WORKER_MODEL,
    },
  });
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
    requestOwnService,
  });
  return Object.freeze({
    binding,
    openWork,
    requestOwnService,
    schedules: Object.freeze(schedules),
    executeWorld,
    operationSources: Object.freeze([
      Object.freeze({ module: "@red-cup-engineering/animating/software-change/mission/development", operations: hostedDevelopmentOperations({binding,config}) }),
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
        developmentRequestAt:hostedDevelopmentRequestAt({binding,config}),
        ...(hostExecuteWorld===undefined?{}:{executeWorld:hostExecuteWorld}),
        ...(config.activityPub?.nodeHost===undefined?{}:{actorMesh:ownServiceMesh}),
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
