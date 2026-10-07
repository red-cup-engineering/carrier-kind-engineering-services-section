/**
 * People: who may sign in to bare-cedar-fog.561.group, and which of them are operators. principals.json holds
 * every admitted person (a Google address, a username and password, a Hive account); an entry with
 * `role: "operator"` is an operator, as is the bootstrap address OPS_ALLOWED_EMAIL. Operators read the
 * Group's books, records, world and businesses and admit people at `/people`; everyone admitted works
 * in the world through the offices they hold. A machine client an operator issued (an `actor:`
 * subject) reads as an operator, as the harnesses that read the books do.
 * @module
 */
import { createHash, randomBytes } from "node:crypto";
import { htmlRepr } from "@red-cup-engineering/http-services-section/representation";
import { readFormBody } from "@red-cup-engineering/http-services-section/body";
import { fromSection } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";
import { hashPrincipalSecret, normalizeHumanUsername, readPrincipalsFile, writePrincipalsFile } from "@red-cup-engineering/computer-web-server/admission/principals";

const BODY_LIMIT = 16 * 1024;
const ROLES = Object.freeze(["collaborator", "operator"]);

/** The name a principal entry signs in under, as its session labels it. */
function labelOf(entry) {
  if (entry?.kind === "email") return entry.email;
  if (entry?.kind === "human") return entry.username;
  if (entry?.kind === "hive") return `@${entry.account}`;
  return undefined;
}

/** The MetroPlat account a principal acts as, where it is known before first sign-in. */
function metroplatAccount(entry) {
  const hash = (subject) => createHash("sha256").update(subject).digest("hex");
  if (entry?.kind === "human") return `password:${hash(`password:${entry.username}`)}`;
  if (entry?.kind === "hive") return `hive:${hash(`hive:${entry.account}`)}`;
  return undefined;
}

/** Whether a signed-in principal is an operator. */
export function isOperator(principal, { stateDir, allowedEmail }) {
  if (!principal) return false;
  if (principal.provider === "bearer") {
    if (typeof principal.subjectHash === "string" && principal.subjectHash.startsWith("actor:")) return true;
  }
  const label = String(principal.label ?? "").toLowerCase();
  if (label === "") return false;
  if (allowedEmail !== undefined && label === allowedEmail) return true;
  return readPrincipalsFile(stateDir).some((entry) => !entry?.revoked && entry?.role === "operator" && labelOf(entry)?.toLowerCase() === label);
}

function page(title, navigation, tiles, status = 200) {
  const html = renderTuftePacket(fromSection({ affirmed: [] }, { subject: "/people", title }), { source: "/people", projection: "ops.people.tufte" }, {
    title, tiles: [{ title: navigation.title ?? "Group", links: navigation, span: 12 }, ...tiles],
  }).html;
  return htmlRepr(html, { status, cacheControl: { noStore: true } });
}

/** A page saying a room is for operators, for a signed-in person who is not one. */
export function operatorsOnly(navigation) {
  return page("For operators", navigation, [{ title: "For operators", span: 12, content: "This room holds the Group's books and records, which operators read. In the world, `powers` lists what your offices let you do." }], 403);
}

/** Wrap an app's resources so that those `guarded(resource)` names answer only operators. */
export function guardOperators(app, guarded, { stateDir, allowedEmail, navigation: links, navigationTitle = "Group" }) {
  const navigation = Object.assign([...links], { title: navigationTitle });
  return { ...app, resources: app.resources.map((resource) => !guarded(resource) ? resource : {
    ...resource,
    handler: (ctx) => {
      const principal = ctx.locals?.principal;
      if (principal && !isOperator(principal, { stateDir, allowedEmail })) return operatorsOnly(navigation);
      return resource.handler(ctx);
    },
  }) };
}

function sameOrigin(headers) {
  if (headers.authorization !== undefined) return true;
  try { return new URL(headers.origin ?? "").host === headers.host; } catch { return false; }
}

function roster(stateDir, allowedEmail) {
  const entries = readPrincipalsFile(stateDir).filter((entry) => labelOf(entry) !== undefined);
  const rows = entries.map((entry) => [
    { text: labelOf(entry) },
    { text: entry.kind === "human" ? "username and password" : entry.kind === "hive" ? "Hive Keychain" : "Google" },
    { text: entry.revoked ? "revoked" : entry.role ?? "collaborator" },
    { text: metroplatAccount(entry) ?? "set at first sign-in" },
    { text: String(entry.createdAt ?? "").slice(0, 10) },
  ]);
  if (allowedEmail !== undefined && !entries.some((entry) => entry.kind === "email" && entry.email === allowedEmail)) {
    rows.unshift([{ text: allowedEmail }, { text: "Google" }, { text: "operator (bootstrap)" }, { text: "set at first sign-in" }, { text: "" }]);
  }
  return { columns: [{ label: "person" }, { label: "signs in with" }, { label: "role" }, { label: "MetroPlat account" }, { label: "admitted" }], rows, empty: "Nobody yet." };
}

function peopleTiles(stateDir, allowedEmail, notice) {
  const role = { name: "role", kind: "select", label: "role", options: ROLES.map((value) => ({ value, label: value, ...(value === "collaborator" ? { selected: true } : {}) })) };
  return [
    ...(notice ? [{ title: notice.title, span: 12, content: notice.content }] : []),
    { title: "People", span: 12, table: roster(stateDir, allowedEmail) },
    { title: "Admit a person with a username", span: 6, form: { action: "/people", method: "post", fields: [
      { name: "action", kind: "hidden", value: "admit-username" },
      { name: "username", kind: "text", label: "username", required: true, description: "Lowercase letters, digits, dots, underscores or hyphens. A password is made for them and shown once." },
      role,
    ], submitters: [{ label: "Admit" }] } },
    { title: "Admit a Google address", span: 6, form: { action: "/people", method: "post", fields: [
      { name: "action", kind: "hidden", value: "admit-email" },
      { name: "email", kind: "email", label: "email", required: true },
      role,
    ], submitters: [{ label: "Admit" }] } },
    { title: "Admit a Hive account", span: 6, form: { action: "/people", method: "post", fields: [
      { name: "action", kind: "hidden", value: "admit-hive" },
      { name: "account", kind: "text", label: "Hive account", required: true },
      role,
    ], submitters: [{ label: "Admit" }] } },
    { title: "Change a role, or revoke", span: 6, form: { action: "/people", method: "post", fields: [
      { name: "action", kind: "select", label: "change", options: [{ value: "set-role", label: "set role" }, { value: "revoke", label: "revoke" }, { value: "restore", label: "restore" }] },
      { name: "person", kind: "text", label: "person (as listed)", required: true },
      role,
    ], submitters: [{ label: "Apply" }] } },
    { title: "Offices", span: 12, content: "An admitted person works through the offices they hold. Seat them from the world with the office-incumbency-admit power, using the MetroPlat account listed here (a Google account's is set when they first sign in)." , },
  ];
}

/** Admit, re-role, revoke or restore one person; returns a notice for the page. */
export function applyPeopleChange(stateDir, fields) {
  const principals = readPrincipalsFile(stateDir);
  const role = ROLES.includes(fields.role) ? fields.role : "collaborator";
  const add = (entry, match) => {
    if (principals.some(match)) throw new TypeError(`${labelOf(entry)} is already admitted`);
    principals.push({ ...entry, role, createdAt: new Date().toISOString() });
    writePrincipalsFile(stateDir, principals);
  };
  switch (fields.action) {
    case "admit-username": {
      const username = normalizeHumanUsername(fields.username ?? "");
      const password = randomBytes(18).toString("base64url");
      add({ kind: "human", username, ...hashPrincipalSecret(password) }, (entry) => entry.kind === "human" && entry.username === username);
      return { title: `Admitted ${username}`, content: `Give ${username} this password now; it is shown once and stored only as a hash: ${password}  They sign in at /login/password. Their MetroPlat account is ${metroplatAccount({ kind: "human", username })}.` };
    }
    case "admit-email": {
      const email = String(fields.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+$/u.test(email)) throw new TypeError("email must be an address");
      add({ kind: "email", email }, (entry) => entry.kind === "email" && entry.email === email);
      return { title: `Admitted ${email}`, content: `${email} signs in with Google at /sign-in.` };
    }
    case "admit-hive": {
      const account = String(fields.account ?? "").trim().toLowerCase().replace(/^@/u, "");
      if (!/^[a-z][a-z0-9.-]{2,15}$/u.test(account)) throw new TypeError("a Hive account is 3-16 lowercase letters, digits, dots or hyphens");
      add({ kind: "hive", account }, (entry) => entry.kind === "hive" && entry.account === account);
      return { title: `Admitted @${account}`, content: `@${account} signs in with Hive Keychain at /sign-in. Their MetroPlat account is ${metroplatAccount({ kind: "hive", account })}.` };
    }
    case "set-role":
    case "revoke":
    case "restore": {
      const person = String(fields.person ?? "").trim().toLowerCase();
      const entry = principals.find((candidate) => labelOf(candidate)?.toLowerCase() === person);
      if (entry === undefined) throw new TypeError(`${person} is not admitted`);
      if (fields.action === "set-role") entry.role = role;
      else if (fields.action === "revoke") entry.revoked = true;
      else delete entry.revoked;
      writePrincipalsFile(stateDir, principals);
      return { title: `Updated ${person}`, content: fields.action === "set-role" ? `${person} is now ${role}.` : fields.action === "revoke" ? `${person} can no longer sign in.` : `${person} can sign in again.` };
    }
    default:
      throw new TypeError("unknown change");
  }
}

/** `/people`: the roster, and the forms that admit people, for operators. */
export function peopleApp({ stateDir, allowedEmail, navigation: links, navigationTitle = "Group" }) {
  const navigation = Object.assign([...links], { title: navigationTitle });
  const handler = async (ctx) => {
    const principal = ctx.locals?.principal;
    if (!principal) return { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent("/people")}` } };
    if (!isOperator(principal, { stateDir, allowedEmail })) return operatorsOnly(navigation);
    if (ctx.req.method === "GET") return page("People", navigation, peopleTiles(stateDir, allowedEmail));
    if (!sameOrigin(ctx.req.headers)) return { status: 403 };
    const fields = Object.fromEntries(await readFormBody(ctx.req, { maxBytes: BODY_LIMIT }));
    let notice;
    try { notice = applyPeopleChange(stateDir, fields); }
    catch (error) { return page("People", navigation, peopleTiles(stateDir, allowedEmail, { title: "Refused", content: error.message }), 400); }
    return page("People", navigation, peopleTiles(stateDir, allowedEmail, notice));
  };
  return { resources: [{ id: "ops-people", match: "/people", methods: ["GET", "POST"], produces: ["text/html"], handler }] };
}
