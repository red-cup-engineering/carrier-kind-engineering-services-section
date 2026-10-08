// Filesystem custody for the durable A2A stores: a task source for
// DurableA2aTaskStore and a coordination source for the push-notification
// store, each one JSON record per identity written by atomic rename.
import { randomUUID } from "node:crypto";
import { readFile, readdir, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
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
  return join(root, `${sha256Hex(identity)}.json`);
}

async function readRecord(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const writeRecord = (path, value, options = {}) => writeFileText(path, `${JSON.stringify(value)}\n`, { mode: 0o600, ...options });

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
    async create(record) {
      return lane(async () => {
        const stored = clone(record);
        const file = recordPath(root, `${record.tenant ?? ""}\0${record.taskId}`);
        try {
          await writeRecord(file, stored, { flag: "wx" });
          return { created: true, record: clone(stored) };
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
          return { created: false, record: clone(await readRecord(file)) };
        }
      });
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
        const stored = { ...clone(record), contentSha256: sha256Hex(body), etag: randomUUID() };
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
