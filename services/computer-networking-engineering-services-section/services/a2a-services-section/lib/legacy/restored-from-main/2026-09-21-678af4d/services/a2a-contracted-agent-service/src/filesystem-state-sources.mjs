import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

const PROVIDER_ID = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function serializedLane() {
  let pending = Promise.resolve();
  return (operation) => {
    const current = pending.then(operation, operation);
    pending = current.catch(() => {});
    return current;
  };
}

function recordPath(root, identity) {
  return join(root, `${digest(identity)}.json`);
}

async function readRecord(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeRecord(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

async function listRecords(root) {
  let names;
  try {
    names = await readdir(root);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const records = await Promise.all(
    names.filter((name) => name.endsWith(".json")).sort().map((name) => readRecord(join(root, name))),
  );
  return records.filter(Boolean);
}

function validateRoot(stateRoot) {
  if (typeof stateRoot !== "string" || !isAbsolute(stateRoot)) {
    throw new Error("contracted A2A filesystem state root must be an absolute path");
  }
  return resolve(stateRoot);
}

function validateProvider(provider) {
  if (typeof provider !== "string" || !PROVIDER_ID.test(provider)) {
    throw new Error("contracted A2A filesystem provider must be a bounded lowercase identifier");
  }
  return provider;
}

export function createFilesystemA2aTaskSource(root) {
  const lane = serializedLane();
  return Object.freeze({
    put(record) {
      return lane(async () => {
        const stored = clone(record);
        await writeRecord(recordPath(root, `${record.tenant ?? ""}\0${record.taskId}`), stored);
        return clone(stored);
      });
    },
    async get({ taskId, tenant = "" }) {
      return clone(await readRecord(recordPath(root, `${tenant}\0${taskId}`)));
    },
    async list({ tenant = "" } = {}) {
      return clone((await listRecords(root)).filter((record) => (record.tenant ?? "") === tenant));
    },
  });
}

export function createFilesystemA2aCoordinationSource(root) {
  const lane = serializedLane();
  const identity = ({ namespace, tenant = "", key }) => `${namespace}\0${tenant}\0${key}`;
  return Object.freeze({
    put(record) {
      return lane(async () => {
        const body = JSON.stringify(record);
        const stored = { ...clone(record), contentSha256: digest(body), etag: randomUUID() };
        await writeRecord(recordPath(root, identity(record)), stored);
        return clone(stored);
      });
    },
    async get(record) {
      return clone(await readRecord(recordPath(root, identity(record))));
    },
    async list({ namespace, tenant = "" }) {
      return clone((await listRecords(root)).filter(
        (record) => record.namespace === namespace && (record.tenant ?? "") === tenant,
      ));
    },
    remove(record) {
      return lane(async () => {
        try {
          await rm(recordPath(root, identity(record)));
          return true;
        } catch (error) {
          if (error.code === "ENOENT") return false;
          throw error;
        }
      });
    },
  });
}

export function createFilesystemContractedAgentSources({ stateRoot, provider }) {
  const root = join(validateRoot(stateRoot), validateProvider(provider));
  return Object.freeze({
    taskSource: createFilesystemA2aTaskSource(join(root, "tasks")),
    coordinationSource: createFilesystemA2aCoordinationSource(join(root, "coordination")),
  });
}

export function createFilesystemContractedAgentSourcesFromEnvironment(environment = process.env) {
  return createFilesystemContractedAgentSources({
    stateRoot: environment.EMSWEB_A2A_STATE_ROOT,
    provider: environment.EMSWEB_PROVIDER_NAME,
  });
}
