// Foundational capabilities now resolve from their atomic owners. The coarse
// July 31 packages remain temporary compatibility exports while their other
// capabilities and consumers are migrated.
export type * from "@red-cup-engineering/http-server-application-contract-service";
export { compose, mergeApps } from "@red-cup-engineering/compose-http-application-service";
export {
  emptyRepr,
  htmlRepr,
  jsonRepr,
  textRepr,
} from "@red-cup-engineering/form-http-response-representation-service";
export {
  wellKnown,
  type WellKnownEntry,
  type WellKnownOptions,
} from "@red-cup-engineering/form-well-known-http-resources-service";
export {
  readBody,
  readFormBody,
  readJsonBody,
  readMultipartBody,
  readTextBody,
} from "@red-cup-engineering/read-http-request-body-service";
export type {
  BodyParseOptions,
  JsonBodyOptions,
} from "@red-cup-engineering/read-http-request-body-service";
export {
  sse,
  type SseWriter,
} from "@red-cup-engineering/serve-server-sent-events-service";
export {
  createMcpApp,
  DEFAULT_PROTOCOL_VERSION,
} from "@red-cup-engineering/serve-model-context-protocol-over-http-service";
export type {
  Json,
  McpApp,
  McpAppOptions,
  McpAuth,
  McpDispatch,
  McpRequestMeta,
  McpTool,
  McpToolAnnotations,
} from "@red-cup-engineering/serve-model-context-protocol-over-http-service";
// The application contract owns the structural types shared by handlers and
// the runtime. Re-export only the core service's own capabilities here so its
// compatibility exports cannot compete with that canonical ownership.
export {
  allClaims,
  appendEntries,
  appendSetCookie,
  appendVary,
  applyCacheControl,
  applyCors,
  applySecurityHeaders,
  claimOf,
  CODINGS,
  compress,
  compressStream,
  contextFor,
  corsOriginAllowed,
  corsPreflight,
  corsPreflightDecision,
  createProjectedEventHub,
  createServer,
  createSseHub,
  DEFAULT_TYPES,
  decompress,
  decompressStream,
  deleteCookie,
  ensureDateHeader,
  getCookie,
  getSignedCookie,
  handler,
  HttpProblem,
  httpProblem,
  installGracefulShutdown,
  isHttpProblem,
  mountAt,
  problem,
  problemDetails,
  problemErrorHandler,
  problemFromError,
  problemRepr,
  resolveProblemInstance,
  routeAdmissionJudgments,
  routeAdmissionReport,
  routeAllowedMethods,
  routeAllowHeader,
  routeMethodAllowed,
  send,
  sendProblem,
  serveScripts,
  setCookie,
  setSignedCookie,
  start,
  staticFiles,
  statusTitle,
  strongEtag,
  traceRequest,
  writeSseComment,
  writeSseEvent,
  zstdSupported,
} from "@red-cup-engineering/http-server-core-service";
export type {
  CorsPreflightDecision,
  DeleteCookieOptions,
  GracefulShutdownHandle,
  GracefulShutdownOptions,
  GracefulShutdownPhase,
  GracefulShutdownSignalSource,
  GracefulShutdownState,
  GracefulShutdownTarget,
  HttpProblemOptions,
  ProblemDetails,
  RequestAdmissionJudgment,
  RequestTraceSettlement,
  RouteAdmissionDenial,
  RouteAdmissionInput,
  RouteAdmissionReport,
  RouteAdmissionResource,
  ScriptFn,
  ScriptMap,
  ServerTimeoutOptions,
  SseHub,
  SseSink,
  StartOptions,
  TopicEvent,
} from "@red-cup-engineering/http-server-core-service";
export * from "@red-cup-engineering/http-edge-service";
export * from "@red-cup-engineering/http-platform-emulation-service";
export * from "@red-cup-engineering/http-observability-service";
export * from "@red-cup-engineering/mesh-networking-service";
