import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFlatfileActivityPubRuntime } from "./flatfile-runtime.mjs";
import { createActivityPubJournalCustody } from "./journal-custody.mjs";
import { importActivityPubOutbox } from "./outbox-store.mjs";
import { createActivityPubProvider, importActorKeyPairs } from "./provider.mjs";
import { generateActorKeyMaterial } from "./keys.mjs";

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required for the local ActivityPub provider`);
  return value;
}

/**
 * Resolve the inbox bearer token without ever writing it to a log stream.
 *
 * The token gates GET reads of the actor's own inbox collection (see this
 * module's own `authorizeInbox` binding below), so it must be stable across
 * an ordinary restart — an operator or script that captured it once needs it
 * to keep working. It is therefore persisted 0600 in the state directory
 * (`<ACTIVITYPUB_STATE_DIR>/bearer-token`, or the exact path in
 * `ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE` if that's set — the same file-shape
 * contract the activitypub-server application's `readBearerToken` reads for
 * the cloud path) and reused on the next boot unless rotation is requested. There is
 * no filesystem location to persist to when neither a state path nor an
 * explicit token-file path is available (e.g. an in-process test harness
 * that injects its own `runtime`); in that case the token stays in-memory
 * only, matching the previous ephemeral-per-boot behavior.
 */
async function resolveBearerToken({ environment, stateDirectory, rotate }) {
  const explicit = environment.ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE;
  const tokenPath = typeof explicit === "string" && explicit.trim() !== ""
    ? path.resolve(explicit)
    : (stateDirectory === undefined ? undefined : path.resolve(stateDirectory, "bearer-token"));
  if (tokenPath === undefined) return { bearerToken: randomBytes(32).toString("base64url"), bearerTokenPath: null };
  await mkdir(path.dirname(tokenPath), { recursive: true });
  if (!rotate) {
    try {
      const existing = (await readFile(tokenPath, "utf8")).trim();
      if (existing.length >= 32) return { bearerToken: existing, bearerTokenPath: tokenPath };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const bearerToken = randomBytes(32).toString("base64url");
  await writeFile(tokenPath, `${bearerToken}\n`, { mode: 0o600 });
  await chmod(tokenPath, 0o600);
  return { bearerToken, bearerTokenPath: tokenPath };
}

function bearerMatches(request, expected) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const presented = Buffer.from(authorization.slice("Bearer ".length));
  const wanted = Buffer.from(expected);
  return presented.length === wanted.length && timingSafeEqual(presented, wanted);
}

async function persistentActorKeyPairs(keyPath) {
  const resolved = path.resolve(keyPath);
  await mkdir(path.dirname(resolved), { recursive: true, mode: 0o700 });
  let material;
  try {
    material = JSON.parse(await readFile(resolved, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    material = await generateActorKeyMaterial();
    try {
      await writeFile(resolved, `${JSON.stringify(material, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
      material = JSON.parse(await readFile(resolved, "utf8"));
    }
  }
  await chmod(resolved, 0o600);
  return importActorKeyPairs(material);
}

/**
 * Construct one embeddable local ActivityPub provider without opening a
 * network listener. The returned lifecycle owns the durable state-directory runtime
 * and persisted inbox token created for the provider.
 */
export async function createLocalActivityPubProvider(options = {}) {
  const environment = options.environment ?? process.env;
  const runtime = options.runtime ?? createFlatfileActivityPubRuntime({ environment, stateDirectory: options.stateDirectory });
  const custody = options.custody ?? createActivityPubJournalCustody({ stateDirectory: runtime.stateDirectory });
  const rotate = options.rotateBearerToken === true || environment.ACTIVITYPUB_ROTATE_BEARER_TOKEN === "true";
  const resolvedToken = options.bearerToken !== undefined
    ? { bearerToken: options.bearerToken, bearerTokenPath: null }
    : await resolveBearerToken({ environment, stateDirectory: runtime.stateDirectory, rotate });
  const bearerToken = resolvedToken.bearerToken;
  if (typeof bearerToken !== "string" || bearerToken.length < 32) throw new TypeError("ActivityPub inbox bearer token must contain at least 32 characters");
  const resolvedOutboxPath = options.outboxPath ?? environment.ACTIVITYPUB_OUTBOX_PATH;
  const outbox = options.outbox ?? (options.listOutbox === undefined ? custody.outbox : undefined);
  if (outbox !== undefined && resolvedOutboxPath !== undefined) await importActivityPubOutbox(resolvedOutboxPath, outbox);
  const origin = new URL(options.origin ?? required(environment, "ACTIVITYPUB_ORIGIN"));
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("ACTIVITYPUB_ORIGIN must use HTTPS outside loopback development");
  }
  const actorInputs = options.actors;
  let actors;
  if (actorInputs !== undefined) {
    if (!Array.isArray(actorInputs) || actorInputs.length === 0) throw new TypeError("ActivityPub local actors must be a nonempty array");
    actors = await Promise.all(actorInputs.map(async (actor) => Object.freeze({
      ...actor,
      keyPairs: actor.keyPairs ?? await persistentActorKeyPairs(actor.keyPath),
    })));
  } else {
    const identifier = options.identifier ?? required(environment, "ACTIVITYPUB_IDENTIFIER");
    actors = [Object.freeze({
      identifier,
      actorName: options.actorName ?? required(environment, "ACTIVITYPUB_ACTOR_NAME"),
      summary: options.summary ?? required(environment, "ACTIVITYPUB_ACTOR_SUMMARY"),
      ...(options.cell ?? environment.ACTIVITYPUB_CELL_ID ? { cell: options.cell ?? environment.ACTIVITYPUB_CELL_ID } : {}),
      ...(options.controller ?? environment.ACTIVITYPUB_CONTROLLER ? { controller: options.controller ?? environment.ACTIVITYPUB_CONTROLLER } : {}),
      keyPairs: await persistentActorKeyPairs(options.keyPath ?? required(environment, "ACTIVITYPUB_KEYS_PATH")),
    })];
  }
  const actorsByIdentifier = new Map(actors.map((actor) => [actor.identifier, actor]));
  if (actorsByIdentifier.size !== actors.length) throw new TypeError("ActivityPub local actor identifiers must be distinct");
  const keyedActors=new Map();
  const resolveActor=async identifier=>{
    if(options.resolveActor===undefined)return actorsByIdentifier.get(identifier)??null;
    const authored=await options.resolveActor(identifier,actorsByIdentifier.get(identifier));
    if(authored==null)return null;
    if(authored.identifier!==identifier||!/^[a-z0-9][a-z0-9._-]*$/u.test(identifier))throw new TypeError('dynamic actor must retain its admitted identifier');
    let keys=keyedActors.get(identifier);
    if(!keys){keys=authored.keyPairs?Promise.resolve(authored.keyPairs):persistentActorKeyPairs(authored.keyPath);keyedActors.set(identifier,keys);}
    return {...authored,keyPairs:await keys};
  };
  const onActivity = options.onActivity ?? (async () => {});
  if (typeof onActivity !== "function") throw new TypeError("ActivityPub customer onActivity must be a function");
  const provider = createActivityPubProvider({
    origin: origin.href,
    identifier: actors[0].identifier,
    identifiers: actors.map((actor) => actor.identifier),
    resolveActor,
    dynamicActors:options.dynamicActors===true,
    kv: custody.kv,
    ...(options.queue === false ? {} : { queue: runtime.queue }),
    ...(options.allowPrivateAddress ?? (environment.ACTIVITYPUB_ALLOW_PRIVATE_ADDRESS === "true") ? { allowPrivateAddress: true } : {}),
    onActivity: async (arrival) => {
      const settlement = await custody.inbox.retain(arrival);
      await onActivity(Object.freeze({ ...arrival, ...(settlement === undefined ? {} : { settlement }) }));
    },
    authorizeInbox: ({ request }) => bearerMatches(request, bearerToken),
    inboxIndex: custody.inboxIndex,
    ...(custody.followers === undefined ? {} : { followers: custody.followers }),
    ...(outbox === undefined ? {} : { outbox }),
    ...(options.listOutbox !== undefined ? { listOutbox: options.listOutbox } : outbox === undefined ? { listOutbox: async () => ({ items: [] }) } : {}),
    ...(options.appendToOutbox === undefined ? {} : { appendToOutbox: options.appendToOutbox }),
  });
  return Object.freeze({
    provider,
    runtime,
    inbox:custody.inbox,
    bearerToken,
    bearerTokenPath: resolvedToken.bearerTokenPath,
    close: async () => { runtime.close?.(); },
  });
}
