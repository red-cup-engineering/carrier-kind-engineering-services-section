// The resident worker carries single authorized invocations and single native
// transport effects. An arena, journal, source graph, or provider never crosses.
export const ENTERPRISE_WORKER_MESSAGE_BYTES = 1_048_576;
export const RESIDENT_OPERATIONS = Object.freeze(["enterprise-loop-run", "enterprise-work-run", "work-peer-catch-up"]);
export const REPLICATION_PORTS = Object.freeze(["deliver", "signed-get", "admit-held"]);

export function boundedWorkerMessage(message) {
  const bytes = Buffer.byteLength(JSON.stringify(message), "utf8");
  if (bytes > ENTERPRISE_WORKER_MESSAGE_BYTES) throw new RangeError("enterprise worker message exceeds its native transport bound");
  return message;
}

// Preserve transport absence/refusal across the worker boundary. Error objects
// themselves lose their custom properties under structured cloning.
export function workerError(error, depth = 0) {
  return {
    name: error?.name ?? "Error", message: String(error?.message ?? error).slice(0, 4000),
    ...(typeof error?.code === "string" ? { code: error.code } : {}),
    ...(typeof error?.statusCode === "number" ? { statusCode: error.statusCode } : {}),
    ...(typeof error?.response?.status === "number" ? { statusCode: error.response.status } : {}),
    ...(depth < 3 && error instanceof AggregateError ? { errors: error.errors.slice(0, 32).map(error => workerError(error, depth + 1)) } : {}),
    ...(depth < 3 && error?.cause !== undefined ? { cause: workerError(error.cause, depth + 1) } : {}),
  };
}

export function receivedWorkerError(value) {
  const error = Array.isArray(value?.errors)
    ? new AggregateError(value.errors.map(receivedWorkerError), value?.message ?? "enterprise worker failed")
    : new Error(value?.message ?? "enterprise worker failed");
  error.name = value?.name ?? "Error";
  if (value?.code !== undefined) error.code = value.code;
  if (value?.statusCode !== undefined) error.statusCode = value.statusCode;
  if (value?.cause !== undefined) error.cause = receivedWorkerError(value.cause);
  return error;
}
