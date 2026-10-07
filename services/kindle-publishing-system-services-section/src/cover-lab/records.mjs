import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function contentId(content) {
  return `ni:///sha-256;${createHash("sha256").update(canonical(content)).digest("base64url")}`;
}

export function addressedRecord(type, version, content) {
  if (typeof type !== "string" || !type || !Number.isInteger(version)) throw new TypeError("record type and integer version are required");
  const body = Object.freeze({ type, version, ...content });
  return Object.freeze({ id: contentId(body), ...body });
}

export async function writeAddressedRecord(root, record) {
  if (record?.id !== contentId(Object.fromEntries(Object.entries(record).filter(([key]) => key !== "id")))) throw new TypeError("record id does not address its content");
  const directory = join(root, record.type);
  const path = join(directory, `${record.id.slice("ni:///sha-256;".length)}.json`);
  const bytes = `${JSON.stringify(record, null, 2)}\n`;
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(path, bytes, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error?.code !== "EEXIST" || await readFile(path, "utf8") !== bytes) throw error; }
  return path;
}

export const HUMAN_BOUNDARY_TYPES = Object.freeze([
  "RESERVED_HUMAN_AUTHORITY_REQUIRED",
  "EXTERNAL_PROVIDER_REQUIRES_HUMAN",
  "LEGAL_NONDELEGABLE",
]);

export function humanBoundary({ reason, boundaryType, at, detail = {} }) {
  if (!HUMAN_BOUNDARY_TYPES.includes(boundaryType)) throw new TypeError(`invalid human boundary type: ${boundaryType}`);
  return addressedRecord("CoverLabHumanBoundary", 1, { reason, boundaryType, at, detail });
}
