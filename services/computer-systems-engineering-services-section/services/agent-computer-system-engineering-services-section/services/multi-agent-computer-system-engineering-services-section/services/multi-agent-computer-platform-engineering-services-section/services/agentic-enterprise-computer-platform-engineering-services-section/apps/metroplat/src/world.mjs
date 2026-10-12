/**
 * The world: MetroPlat as a MUD one logs into as a character.
 *
 * FeltOS is the driver and session layer, and MetroPlat's operations are the mudlib (the
 * 2026-08-11 reconstitution and roadmap notes). The world is the house as it stands in the tree
 * the node runs from: every services section is a room, read as its ServicesSectionForm, joined
 * to its enclosing section, and the top-level ones open off the world plaza. A room shows what
 * its section holds (its own words, its package, books and skills, and a census of its content,
 * code and data), and each office stands in its section's room with its duties, the verbs its
 * skills require, and the characters seated in it. Seeing a thing grants nothing; `locate` finds
 * any of them by words and `travel` goes straight to a section.
 *
 * An account connects as the character it masks (or as itself), reports to its office's room,
 * and speaks MUD commands: look, go, say, who, tell, help, and the house's operation verbs. An
 * operation verb is a command, but only the verbs a character's offices grant are its powers
 * (the organisational form's position-permission cost: the unit for a granted verb, forbidden
 * otherwise). The public command boundary checks current standing and dispatches a granted power
 * under the account; FeltOS remains the world for navigation and conversation, while the operation's
 * own journal witness records its durable result.
 *
 * The house's work is what happens in the city. Every move of the work arena is told in the room
 * its work is about, and overheard there and in every room enclosing it (world-tellings.mjs):
 * a character is told what was said around it since its last turn, after the world's own answer.
 * A room's open threads are its quests (world-quests.mjs), ranked as the arena ranks an
 * agenda; `quests` lists them (`quests unclaimed`, the market's), `quest <handle>` reads one,
 * `journal` lists what awaits the character's own move (its agenda, and its micro-enterprises'),
 * `tellings` reads what was said lately, and a power's `thread=<handle>` names the thread a quest's
 * handle names. A character's first turn opens with its journal in a line. The arena's moves are
 * verbs of the city: `<move> <handle> [words] [key=value ...]` plays one on a thread (work-move),
 * and `post <opening> <words>` opens a thread about the room the character stands in (work-open). A turn carries what it
 * showed as data too (`packages`, GMCP's discipline), so an agent never scrapes the prose; a client
 * that draws the city tracks the journal without a turn (world-journal), as an MMO's quest tracker.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { operation, operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { actorIdFor, createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { composeCapabilities, defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { message } from "@red-cup-engineering/feltos/engine";
import { move, placeOf, values, witnessesOf, subjects, certainValue, contentsOf, exitsOf } from "@red-cup-engineering/feltos/world";
import { canonicalPlayer, officeReading, resolve } from "@red-cup-engineering/organizing/agency";
import { subjectOf } from "@red-cup-engineering/organizing/agency/cast";
import { OPENING_MOVES, RESPONSE_MOVES, deliveriesToAssay, threadSummary } from "@red-cup-engineering/organizing/enterprise";
import { readServicesSectionTree } from "@red-cup-engineering/services-section-form-services-section/read-services-section-tree";
import { tellBodyRecords } from "./bodies.mjs";
import { agencyAt, agencyRootOf, officesOfAccount, providersOfAccount, readCharacterMasks, readIncumbencyClaims, readStanding } from "./offices.mjs";
import { operationAffordanceCategories, projectOperationAffordances } from "./operation-affordances.mjs";
import { JURISDICTION_TINTS, atlasSchema, cityLayout, jurisdictionOf, worldAtlas, worldFrame } from "./world-atlas.mjs";
import { createPulse, pulseSchema, pulseSites } from "./world-pulse.mjs";
import { QUESTS, createQuests, journalLine, journalSchema, questLine } from "./world-quests.mjs";
import { WHO_MAX, createControlTable, createPresence, shortId } from "./world-people.mjs";
import { clip, createTellings, tellingsReading, tellingsSchema, worldPlaces } from "./world-tellings.mjs";

const PLAZA = "plaza";
const CAPABILITY = "metroplat.world";
const ENTRYPOINTS = new Set(["world-connect", "world-command", "world-atlas", "world-pulse", "world-tellings", "world-journal"]);
/** FeltOS's own world and session verbs, and the world's; an operation of the same name stays an operation only by its catalog. */
const RESERVED = new Set(["read", "commands", "drop", "emote", "examine", "exits", "get", "give", "go", "help", "inventory", "look", "move", "say", "score", "skills", "stats", "take", "who", "whoami", "finger", "chat", "tell", "inbox", "reply", "register", "login", "quit", "report", "powers", "locate", "travel", "quests", "quest", "journal", "tellings", "post", "x", "l", "i"]);
/** The arena's response moves: each a verb of the city when a thread's handle follows it. */
const MOVE_VERBS = new Set(Object.values(RESPONSE_MOVES).flat());
/** The powers that move the work board. */
const BOARD_MOVES = /^work-(?:open|move)$/u;
/**
 * The field a move's words are, when it is typed with words after its thread (`decline <handle> out
 * of our trade`) or after its kind (`post request <need>`): what it says, its reason, its need.
 */
const SAID = Object.freeze({
  decline: "reason", release: "reason", leave: "reason", withdraw: "reason", reject: "reason", answer: "says", argue: "says",
  aim: "purpose", request: "need", propose: "idea", report: "observation", ask: "question", declare: "ruling",
});
const LOCATED = 25;
/** The world's own commands, as `help` lists them before the powers. */
const WORLD_COMMANDS = Object.freeze([
  "look (l), go <exit>, up: see a room and walk the city",
  "locate <words>, travel <section or plaza>: find a place and go straight to it",
  "report: go to your office's room; read <book or skill>: read what a room holds",
  "quests [page], quests unclaimed: the open work placed here (in the plaza, the town's pressing work; unclaimed, the market's)",
  "quest <handle>: one thread, who owes which move, and what was said on it",
  "journal [all] [page]: what awaits your own move (all: and your micro-enterprises')",
  "<move> <handle> [words] [key=value ...]: play a move on a thread (accept, promise, deliver, decline, argue for|against, answer, supersede ...)",
  "post <aim|request|propose|report|ask|declare> <words> [key=value ...]: open a thread about the room you stand in",
  "tellings [all]: what was said here lately (all: in the whole city)",
  "say <words>: speak aloud; who [offset] [limit], tell <name> <words>, finger <name>, emote <action>: the city's people (present within a quarter hour)",
  "inbox [all], tell @handle@node <words>, reply <message-id> <words>: durable signed Semioverse messages",
  "powers, <power> key=value ...: what your offices let you do, and doing it",
]);
/** How many tellings a turn carries of what was said around a character; the rest wait for `tellings`. */
const OVERHEARD = 8;

const slug = (text) => String(text).toLowerCase().replace(/-(services-)?section$|-service$/u, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "section";
const segment = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "x";
const title = (text) => slug(text).split("-").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
const firstSentence = (text) => String(text ?? "").replace(/\s+/gu, " ").trim().split(/(?<=\.)\s/u)[0];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listOf = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const sentence = (text) => String(text).trim().replace(/\.+$/u, "");

/** A section's own words for itself: the first paragraph of its README, links reduced to text. */
function readmeParagraph(readme) {
  if (typeof readme !== "string") return undefined;
  const body = readme.replace(/^---[\s\S]*?\n---\n/u, "");
  const paragraph = body.split(/\n\s*\n/u).map((p) => p.trim()).find((p) => p && !p.startsWith("#") && !p.startsWith("*AGENTS") && !p.startsWith("<"));
  if (paragraph === undefined) return undefined;
  const text = paragraph.replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1").replace(/[*_`]/gu, "").replace(/\s+/gu, " ");
  return text.length > 600 ? `${text.slice(0, 597)}...` : text;
}

const readmeAt = (root, sectionPath) => {
  const readme = path.join(root, sectionPath, "README.md");
  return existsSync(readme) ? readFileSync(readme, "utf8") : undefined;
};

/** What a section holds, as its ServicesSectionForm counts it. */
function sectionHoldings(form) {
  const glossary = form.content.text.glossary, articles = form.content.text.documents.articles, teaching = articles.teachingArticles;
  const counted = (rows) => rows.filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
  const content = counted([
    [articles.notes, "note"], [glossary.terms, "glossary term"], [glossary.concepts, "concept"], [glossary.topics, "topic"],
    [teaching.explanations, "explanation"], [teaching.guides, "guide"], [teaching.references, "reference"], [teaching.tutorials, "tutorial"],
    [articles.specifications, "specification"], [articles.researchArticles, "research article"], [articles.bibliographies, "bibliography", "bibliographies"],
  ]);
  const code = counted([[form.code.src.length, "source module"], [form.code.scripts.length, "script"], [form.code.apps.length, "app module"], [form.code.test.length, "test"]]);
  const data = [...["records", "logs", "state"].filter((kind) => form.data[kind]), ...form.data.other];
  return [
    content.length > 0 ? `Content: ${content.join(", ")}.` : "",
    code.length > 0 ? `Code: ${code.join(", ")}.` : "",
    data.length > 0 ? `Data: ${data.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}

/** A package as its manifest declares it: name, version, description, modules and commands. */
function packageDescription(manifest) {
  const listed = (names, noun) => (names.length === 0 ? "" : ` ${noun}: ${names.slice(0, 12).join(", ")}${names.length > 12 ? `, and ${names.length - 12} more` : ""}.`);
  const modules = manifest.exports === undefined ? [] : typeof manifest.exports === "string" ? ["."] : Object.keys(manifest.exports);
  const commands = manifest.bin === undefined ? [] : typeof manifest.bin === "string" ? [manifest.name] : Object.keys(manifest.bin);
  const about = typeof manifest.description === "string" && manifest.description.trim() !== "" ? sentence(manifest.description) : "no description is declared";
  return `${manifest.name}${typeof manifest.version === "string" ? ` ${manifest.version}` : ""}: ${about}.${listed(modules, "Modules")}${listed(commands, "Commands")}`;
}

/** A chapter's text: its file without front matter or pandoc heading attributes. */
const chapterBody = (source) => source.replace(/^---[\s\S]*?\n---\n/u, "").replace(/\s*\{\.unnumbered\}/gu, "").trim();
const chapterText = (file) => chapterBody(readFileSync(file, "utf8"));

/**
 * A section's books: each `content/books/<slug>/ebook.json` with its chapters as pages, in order.
 * A page is its chapter's title and text; an installed instance with a public
 * origin can point readers to its own printable edition.
 */
export function sectionBooks(root, sectionPath) {
  const dir = path.join(root, sectionPath, "content", "books");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, "ebook.json"))).map((entry) => {
    const bookDir = path.join(dir, entry.name);
    const manifest = JSON.parse(readFileSync(path.join(bookDir, "ebook.json"), "utf8"));
    const pages = readdirSync(bookDir).filter((name) => name.endsWith(".md")).sort().map((name, index) => {
      const source = readFileSync(path.join(bookDir, name), "utf8");
      const body = chapterBody(source);
      const title = /^title:\s*"?(.+?)"?\s*$/mu.exec(source)?.[1] ?? /^#\s+(.+)$/mu.exec(body)?.[1] ?? name;
      const prefix = /^(\d+)-/u.exec(name);
      return Object.freeze({ n: prefix ? Number(prefix[1]) : index + 1, title, text: body, file: path.join(bookDir, name) });
    });
    return Object.freeze({ slug: manifest.slug ?? entry.name, title: manifest.title ?? entry.name, subtitle: manifest.subtitle ?? "", pages: Object.freeze(pages) });
  });
}

/** What the world shows of a section reading: its own words, its holdings, and its packages. */
export function sectionSummary({ form, readme, packages = [] }) {
  return Object.freeze({
    path: form.path,
    about: readmeParagraph(readme),
    holdings: sectionHoldings(form),
    packages: Object.freeze(packages.filter((held) => typeof held.manifest?.name === "string")
      .map((held) => Object.freeze({ unit: held.path, name: held.manifest.name, description: packageDescription(held.manifest) }))),
  });
}

const sectionSummaries = new Map();
/**
 * The services sections under an agency root as the world shows them, read once per root:
 * the node runs from a released tree that does not change under it (a new release starts a new
 * process), so one walk serves every rebuild of the world, and only the summaries are kept.
 */
export function sectionSummariesAt(root) {
  if (!sectionSummaries.has(root)) {
    const reading = readServicesSectionTree({ root }).then((tree) => Object.freeze(tree.sections.map(sectionSummary)));
    reading.catch(() => sectionSummaries.delete(root));
    sectionSummaries.set(root, reading);
  }
  return sectionSummaries.get(root);
}

/**
 * The world as a FeltOS game, from the house's sections (`sectionSummary` records), the
 * agency registry, and the offices accounts hold here. A section that seats offices but is no
 * services section (an app or a site) is a room too.
 */
export function metroplatGame(agency, { root, sections = [], seats = new Map(), identity = { title: "MetroPlat" } } = {}) {
  const readingOf = new Map(sections.map((summary) => [summary.path, summary]));
  const sectionPaths = [...new Set([...readingOf.keys(), ...[...agency.offices.values()].map((o) => o.sectionPath)])].sort();
  const shown = (sp) => (root === undefined ? sp : `${path.basename(root)}/${sp}`);
  const roomOf = new Map();
  const used = new Set([PLAZA]);
  for (const sp of sectionPaths) {
    const base = `section:${sp.split("/").filter((p) => p !== "services").map(segment).join(".")}`;
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    roomOf.set(sp, id);
  }
  const parentOf = (sp) => {
    const parts = sp.split("/").slice(0, -1);
    for (; parts.length > 0; parts.pop()) if (roomOf.has(parts.join("/"))) return parts.join("/");
    return undefined;
  };
  const roomAt = (sp) => (roomOf.has(sp) ? roomOf.get(sp) : roomOf.get(parentOf(sp)));
  const tail = (room) => room.slice("section:".length);
  const exitName = (sp) => { const name = slug(sp.split("/").pop()); return /^[a-z]/u.test(name) ? name : `the-${name}`; };
  const rooms = { [PLAZA]: { name: "The World", description: `The plaza of ${identity.title}, where the house's sections open; every services section is a room showing what it holds. Type locate <words> to find a section, package, skill, book or office, travel <section> to go straight to one, help for commands, powers for what your offices let you do, report to go to your office.`, exits: {} } };
  // A section's name is its directory's, less the "-services-section" every section carries; the
  // services section a section keeps of its own (561-group/services/561-group-services-section) is
  // then its holder's name again, and is called its holder's services.
  for (const sp of sectionPaths) {
    const name = title(sp.split("/").pop()), parent = parentOf(sp);
    rooms[roomOf.get(sp)] = { name: parent !== undefined && name === title(parent.split("/").pop()) ? `${name} Services` : name, description: "", exits: {} };
  }
  for (const sp of sectionPaths) {
    const room = roomOf.get(sp), parent = parentOf(sp), up = parent === undefined ? PLAZA : roomOf.get(parent);
    rooms[room].exits.up = up;
    let name = exitName(sp);
    while (rooms[up].exits[name] !== undefined) name = `${name}-${Object.keys(rooms[up].exits).length}`;
    rooms[up].exits[name] = room;
  }
  const things = {}, assertions = [];
  for (const sp of sectionPaths) assertions.push({ subject: roomOf.get(sp), predicate: "section-path", object: shown(sp) });
  // Every room is a place with extent in one city, tinted by its jurisdiction (world-atlas.mjs).
  const regions = cityLayout(new Map(sectionPaths.map((sp) => [roomOf.get(sp), rooms[roomOf.get(sp)].exits.up])), PLAZA);
  for (const [room, region] of regions) assertions.push({ subject: room, predicate: "region", object: region });
  assertions.push({ subject: PLAZA, predicate: "tint", object: JURISDICTION_TINTS.house });
  for (const sp of sectionPaths) assertions.push({ subject: roomOf.get(sp), predicate: "tint", object: JURISDICTION_TINTS[jurisdictionOf(sp)] });
  const officeThing = new Map();
  // Skills remain authored AOE records. A skill stands where an office offers it and in its own
  // section, for selective reading; seeing or reading one grants no office or power.
  const placeSkill = (skill, room) => {
    const skillId = `skill:${room}.${sha256Hex(skill.key)}`;
    if (things[skillId] !== undefined) return;
    things[skillId] = {
      name: `the skill ${skill.id}`,
      description: `${skill.description ?? skill.name}. Type read ${skill.key} to load its authored method. Reading a method does not grant authority to execute it.`,
      location: room,
    };
    assertions.push(
      { subject: skillId, predicate: "tag", object: "skill" },
      { subject: skillId, predicate: "slug", object: skill.id },
      { subject: skillId, predicate: "skill-key", object: skill.key },
      { subject: skillId, predicate: "method", object: {
        source: skill.source, ...(skill.closureKind === undefined ? {} : { closureKind: skill.closureKind }),
        requires: skill.requiresCapabilities, text: typeof skill.method === "string" ? skill.method : "",
      } },
    );
  };
  for (const office of agency.offices.values()) {
    const reading = officeReading(agency, office.key);
    const id = `office:${tail(roomOf.get(office.sectionPath))}.${slug(office.id)}`;
    officeThing.set(office.key, id);
    const about = firstSentence(office.normativeStructure) || firstSentence(office.charter) || office.dutyClaims?.[0] || `The ${office.name} office.`;
    things[id] = { name: `the office of ${office.name}`, description: about, location: roomOf.get(office.sectionPath) };
    assertions.push({ subject: id, predicate: "tag", object: "office" }, { subject: id, predicate: "office-key", object: office.key });
    for (const verb of reading.verbs) assertions.push({ subject: id, predicate: "verb", object: verb });
    for (const duty of reading.duties) assertions.push({ subject: id, predicate: "duty", object: duty.id });
    for (const seat of reading.seats.filter((s) => s.state === "dignitas")) assertions.push({ subject: id, predicate: "seated", object: actorIdFor(seat.holder) });
    for (const reference of reading.skills) {
      const skill = resolve(agency, "skills", reference.key, office.sectionPath);
      if (skill !== undefined) placeSkill(skill, roomOf.get(office.sectionPath));
    }
  }
  for (const skill of agency.skills.values()) {
    const room = roomAt(skill.sectionPath);
    if (room !== undefined) placeSkill(skill, room);
  }
  for (const [holder, keys] of seats) for (const key of keys) if (officeThing.has(key)) assertions.push({ subject: officeThing.get(key), predicate: "seated", object: actorIdFor(holder) });
  // A section's packages: its own, and each app, site, deployment or tool it holds, which stands
  // in that unit's own room when an office seated there made one.
  for (const sp of sectionPaths) {
    for (const { unit, name, description } of readingOf.get(sp)?.packages ?? []) {
      const home = unit === "" ? sp : `${sp}/${unit}`;
      const room = roomOf.get(home) ?? roomOf.get(sp);
      const id = `package:${tail(roomOf.get(sp))}${unit === "" ? "" : `.${segment(unit)}`}`;
      things[id] = { name: `the package ${name}`, description: `${description} Directory: ${shown(home)}`, location: room };
      assertions.push({ subject: id, predicate: "tag", object: "package" }, { subject: id, predicate: "package-name", object: name });
    }
  }
  for (const sp of root ? sectionPaths : []) {
    for (const book of sectionBooks(root, sp)) {
      const id = `book:${tail(roomOf.get(sp))}.${segment(book.slug)}`;
      const edition = identity.origin === undefined ? "" : ` The printable edition is at ${new URL(`library/${book.slug}.pdf`, identity.origin).href} (and .epub).`;
      things[id] = { name: book.title, description: `${book.title}: ${book.subtitle}. It has ${book.pages.length} chapters; type read ${book.slug} for its contents and read ${book.slug} <number> for a chapter.${edition}`, location: roomOf.get(sp) };
      assertions.push({ subject: id, predicate: "tag", object: "book" }, { subject: id, predicate: "slug", object: book.slug });
      for (const { n, title, file } of book.pages) assertions.push({ subject: id, predicate: "page", object: { n, title, file } });
    }
  }
  const officesIn = new Map();
  for (const [id, thing] of Object.entries(things)) if (id.startsWith("office:")) officesIn.set(thing.location, (officesIn.get(thing.location) ?? 0) + 1);
  for (const sp of sectionPaths) {
    const room = roomOf.get(sp), reading = readingOf.get(sp), count = officesIn.get(room) ?? 0;
    const own = (reading === undefined ? readmeParagraph(root ? readmeAt(root, sp) : undefined) : reading.about)
      ?? `The ${rooms[room].name} section${count === 0 ? "" : `, seating ${plural(count, "office")}`}.`;
    rooms[room].description = [own, reading?.holdings ?? "", `Path: ${shown(sp)}`].filter(Boolean).join("\n");
  }
  return defineGame({ id: "metroplat.world", name: `${identity.title} World`, start: PLAZA, capabilities: [CAPABILITY], rooms, things, assertions });
}

/** The offices (world things) an actor is seated in, and the verbs they grant it. */
function standingIn(world, actor) {
  const offices = subjects(world).filter(id => values(world, id, "tag").includes("office") && values(world, id, "seated").includes(actor));
  return { offices, verbs: new Set(offices.flatMap((id) => values(world, id, "verb"))) };
}

/**
 * A power's input as typed after it: JSON (`{"market": "duluth"}`), or words a person would type,
 * `key=value` pairs (`market=duluth limit=20 notes="left a voicemail"`). A bare number, true or
 * false reads as that value unless the power's input schema declares the key text (a parcel
 * number, a ZIP); an unquoted value with commas reads as a list, unless it is JSON whole
 * (`measures=[{"name":"readers","unit":"reader"}]`); a quoted value is text; a dotted key
 * (`values.callerName="Ada"`) sets a field of an object.
 */
export function readPowerInput(argument, schema = {}) {
  const text = String(argument ?? "").trim();
  if (text === "") return {};
  if (text.startsWith("{")) return JSON.parse(text);
  const input = {};
  for (const match of text.matchAll(/([A-Za-z][\w.-]*)=(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))|(\S+)/gu)) {
    const [, key, doubled, single, bare, stray] = match;
    if (stray !== undefined) throw new SyntaxError(`"${stray}" is not key=value`);
    const path = key.split(".");
    let target = input;
    for (const part of path.slice(0, -1)) target = target[part] = target[part] && typeof target[part] === "object" ? target[part] : {};
    const field = path.at(-1);
    if (doubled !== undefined || single !== undefined) { target[field] = (doubled ?? single).replace(/\\(.)/gu, "$1"); continue; }
    if (/^[[{]/u.test(bare)) {
      try { target[field] = JSON.parse(bare); continue; } catch { /* words, as any other */ }
    }
    const declared = path.length === 1 ? schema.properties?.[key] : undefined;
    const textOnly = declared !== undefined && (declared.type === "string" || (declared.enum ?? []).every((v) => typeof v === "string") && declared.enum !== undefined);
    const scalar = (word) => (textOnly ? word : word === "true" ? true : word === "false" ? false : /^-?\d+(\.\d+)?$/u.test(word) ? Number(word) : word);
    target[field] = bare.includes(",") ? bare.split(",").filter(Boolean).map(scalar) : scalar(bare);
  }
  return input;
}

/**
 * A move's input as typed after its thread or kind: key=value pairs (or JSON) set its fields, and
 * any other words are what it says, in its `said` field (`decline 318O_7rq out of our trade`).
 */
export function readSaidInput(argument, said, schema = {}) {
  const text = String(argument ?? "").trim();
  if (text.startsWith("{")) return JSON.parse(text);
  const pairs = [], words = [];
  for (const [, pair, word] of text.matchAll(/([A-Za-z][\w.-]*=(?:"(?:[^"\\]|\\.)*"|'[^']*'|\S+))|(\S+)/gu)) (pair === undefined ? words : pairs).push(pair ?? word);
  const input = readPowerInput(pairs.join(" "), schema);
  if (words.length === 0) return input;
  if (said === undefined) throw new SyntaxError(`"${words[0]}" is not key=value`);
  return { ...input, [said]: words.join(" ").replace(/^(["'])(.*)\1$/su, "$2") };
}

/**
 * Everything a character can find in the world, as words: each section (its name, path and
 * description) and each thing in one (office, package, skill or book), with the room it stands in.
 */
function findingsOf(world) {
  const ids = subjects(world);
  const pathOf = room => certainValue(world, room, "section-path") ?? undefined;
  const finding = (kind, id, room) => {
    const name = certainValue(world, id, "name") ?? id, description = certainValue(world, id, "description") ?? "";
    return { kind, id, name, room, path: pathOf(room), text: [name, id, pathOf(room) ?? "", description].join("\n").toLowerCase() };
  };
  return Object.freeze(ids.flatMap(id => {
    const kind = certainValue(world, id, "kind");
    if (kind === "room") return [finding("section", id, id)];
    const room = certainValue(world, id, "located-in");
    if (certainValue(world, room, "kind") !== "room") return [];
    const tag = ["office", "package", "skill", "book"].find(tag => values(world, id, "tag").includes(tag));
    return [finding(tag ?? kind ?? "thing", id, room)];
  }));
}

/** FeltOS commands for navigation, conversation and discovery; catalog powers dispatch outside the world. */
export function worldCapability({ verbs, affordances = () => ({}), work }) {
  const findings = world => findingsOf(world);
  const pathOf = (world, room) => certainValue(world, room, "section-path") ?? undefined;
  const roomName = (world, room) => certainValue(world, room, "name") ?? room;
  const stamp = (at) => new Date(at).toISOString().slice(5, 16).replace("T", " ");
  const workCommands = work === undefined ? {} : {
    quests: (ctx) => {
      const [first = "", second = ""] = ctx.argument.trim().split(/\s+/u);
      const unclaimed = /^(?:unclaimed|market)$/u.test(first);
      const page = Math.max(1, Number.parseInt(unclaimed ? second : first, 10) || 1);
      const places = work.places();
      if (unclaimed) {
        const { total, quests } = work.quests.market(places, { skip: (page - 1) * QUESTS });
        work.stash(ctx.actor, { name: "Work.Quests", data: { market: true, page, total, quests } });
        if (total === 0) return { events: [ctx.message(ctx.actor, "No work stands unclaimed: every open thread is at home with a micro-enterprise.")] };
        return { events: [ctx.message(ctx.actor, [
          `Unclaimed work: ${plural(total, "thread")} at home nowhere, which no micro-enterprise is seated for, nearest first:`,
          ...quests.map((quest) => questLine(quest, { nameOf: places.nameOf, roomName: room => roomName(ctx.world, room) })),
          `${total > page * QUESTS ? `Type quests unclaimed ${page + 1} for more; ` : ""}type quest <handle> to read one.`,
        ].join("\n"))] };
      }
      const room = placeOf(ctx.world, ctx.actor) ?? PLAZA;
      const { total, quests } = work.quests.in(room, places, { plaza: PLAZA, skip: (page - 1) * QUESTS });
      work.stash(ctx.actor, { name: "Work.Quests", data: { room, page, total, quests } });
      if (total === 0) return { events: [ctx.message(ctx.actor, room === PLAZA
        ? "Nothing on the work board is pressing now or soon. Go to a section and type quests for the work it holds."
        : `No open work is placed at ${roomName(ctx.world, room)} or the rooms it encloses. Type up and quests, or travel plaza for the town's pressing work.`)] };
      return { events: [ctx.message(ctx.actor, [
        room === PLAZA ? `The town's pressing work: ${plural(total, "thread")} whose horizon is now or soon, nearest first:`
          : `Open work at ${roomName(ctx.world, room)} and the rooms it encloses: ${plural(total, "thread")}, nearest first:`,
        ...quests.map((quest) => questLine(quest, { nameOf: places.nameOf, ...(quest.room === room ? {} : { roomName: room => roomName(ctx.world, room) }) })),
        `${total > page * QUESTS ? `Type quests ${page + 1} for more; ` : ""}type quest <handle> to read one.`,
      ].join("\n"))] };
    },
    quest: (ctx) => {
      const handle = ctx.argument.trim();
      if (handle === "") return { events: [ctx.message(ctx.actor, "Quest which? Type quests to see the work here, then quest <handle>.")] };
      const places = work.places();
      const named = work.quests.named(handle, places);
      if (named.length === 0) return { events: [ctx.message(ctx.actor, `No thread on the work board answers to ${handle}.`)] };
      if (named.length > 1) return { events: [ctx.message(ctx.actor, [`Several threads answer to ${handle}; name one by its id:`, ...named.map((thread) => `  ${thread.id}`)].join("\n"))] };
      const { quest, summary, dues } = work.quests.detail(named[0], places);
      const lately = tellingsReading(work.tellings(), { thread: quest.id, limit: 6 }).tellings;
      work.stash(ctx.actor, { name: "Work.Quest", data: { quest, summary, dues, tellings: lately } });
      const takers = summary.promisers ?? summary.holders ?? summary.adopters ?? summary.answerers;
      const awaited = (summary.awaits ?? []).join("|");
      return { events: [ctx.message(ctx.actor, [
        `[${quest.handle}] ${[summary.move, summary.step ?? summary.standing, summary.horizon].filter(Boolean).join(" · ")}`,
        `“${summary.gist}”`,
        `Opened by ${places.nameOf(summary.by)} on ${summary.at.slice(0, 10)}; its work is at ${roomName(ctx.world, quest.room)}${pathOf(ctx.world, quest.room) === undefined ? "" : ` (travel ${pathOf(ctx.world, quest.room)})`}.`,
        summary.home === undefined ? "" : `At home with ${places.nameOf(summary.home)}.`,
        takers === undefined ? "" : `Taken up by ${takers.map(places.nameOf).join(", ")}.`,
        summary.requirements === undefined ? "" : `Its contract: ${plural(summary.requirements, "requirement")}, ${plural(summary.conditions, "condition")}${summary.refined ? ", refined" : ", not yet refined"}${summary.uncovered?.length ? `; uncovered: ${summary.uncovered.join(", ")}` : ""}.`,
        dues.length === 0 ? "Nobody owes it a move." : `Owed: ${dues.map((due) => `${places.nameOf(due.player)}: ${due.turn.join(", ") || "nothing"}${due.may.length === 0 ? "" : ` (may ${due.may.join(", ")})`}`).join("; ")}.`,
        ...(lately.length === 0 ? [] : ["Lately:", ...lately.map((telling) => `  ${stamp(telling.at)} ${telling.prose}`)]),
        awaited === "" ? "" : `To play a move, if your offices grant it: ${(summary.awaits ?? []).map((move) => `${move} ${quest.handle}`).join(", or ")} ...`,
      ].filter(Boolean).join("\n"))] };
    },
    journal: (ctx) => {
      const words = ctx.argument.trim().split(/\s+/u);
      const all = words.some((word) => /^(?:all|house)$/u.test(word));
      const page = Math.max(1, Number.parseInt(words.find((word) => /^\d+$/u.test(word)), 10) || 1);
      const skip = (page - 1) * QUESTS;
      const places = work.places();
      const journal = work.journalOf(ctx.actor);
      const { own, house, houses } = journal;
      const shown = (entries) => entries.slice(skip, skip + QUESTS);
      work.stash(ctx.actor, { name: "Work.Journal", data: work.journalPage(journal, { page, all }) });
      const lines = (entries) => shown(entries).map((entry) => journalLine(entry, { nameOf: places.nameOf, roomName: room => roomName(ctx.world, room) }));
      const theirs = listOf(houses.map(places.nameOf));
      const more = Math.max(own.length, all ? house.length : 0) > skip + QUESTS;
      return { events: [ctx.message(ctx.actor, [
        own.length === 0 ? "Nothing on the work board awaits your own move." : `Your journal: ${plural(own.length, "thread")} await${own.length === 1 ? "s" : ""} your move, nearest first:`,
        ...lines(own),
        ...(house.length === 0 ? [] : all ? [`For ${theirs}, the house${houses.length === 1 ? "" : "s"} you serve: ${plural(house.length, "thread")}:`, ...lines(house)]
          : [`${plural(house.length, "more thread")} await ${theirs}; type journal all.`]),
        own.length + house.length === 0 ? "" : more ? `Type journal${all ? " all" : ""} ${page + 1} for more; type quest <handle> to read one.` : "Type quest <handle> to read one.",
      ].filter(Boolean).join("\n"))] };
    },
    tellings: (ctx) => {
      const everywhere = /^(?:all|city|everywhere)$/u.test(ctx.argument.trim());
      const room = everywhere ? PLAZA : placeOf(ctx.world, ctx.actor) ?? PLAZA;
      const places = work.places();
      const reading = tellingsReading(work.tellings(), { room, hears: places.hears, limit: 15 });
      work.stash(ctx.actor, { name: "Work.Tellings", data: reading });
      const where = room === PLAZA ? "in the city" : `at ${roomName(ctx.world, room)}`;
      if (reading.tellings.length === 0) return { events: [ctx.message(ctx.actor, `Nothing has been told ${where} lately. Type tellings all for the whole city.`)] };
      return { events: [ctx.message(ctx.actor, [
        `Told ${where}, latest last:`,
        ...reading.tellings.map((telling) => `  ${stamp(telling.at)} [${telling.handle}] ${telling.prose}${telling.room === room ? "" : ` (at ${roomName(ctx.world, telling.room)})`}`),
        "Type quest <handle> to read a thread.",
      ].join("\n"))] };
    },
  };
  const commands = {
    ...workCommands,
    locate: (ctx) => {
      const words = ctx.argument.toLowerCase().split(/\s+/u).filter(Boolean);
      if (words.length === 0) return { events: [ctx.message(ctx.actor, "Locate what? Type locate <words>, for example locate glossary prose, or locate package metroplat.")] };
      const kinds = new Set(["section", "office", "package", "skill", "book"]);
      const wanted = words.filter((w) => kinds.has(w.replace(/s$/u, "")));
      const terms = words.filter((w) => !wanted.includes(w));
      // A word matches from the start of a word, so "ice" finds ice but not service.
      const patterns = terms.map((w) => new RegExp(`(?:^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"));
      const matched = findings(ctx.world).filter((f) => (wanted.length === 0 || wanted.some((w) => w.replace(/s$/u, "") === f.kind)) && patterns.every((pattern) => pattern.test(f.text)));
      if (matched.length === 0) return { events: [ctx.message(ctx.actor, `Nothing here answers to ${words.join(" ")}. Try fewer or broader words.`)] };
      // Name matches first, then the shallower section: the nearest answer to what was asked.
      const rank = (f) => [patterns.every((pattern) => pattern.test(f.name.toLowerCase())) ? 0 : 1, (f.path ?? "").split("/").length];
      const ordered = matched.map((f) => [rank(f), f]).sort(([a], [b]) => a[0] - b[0] || a[1] - b[1]).map(([, f]) => f);
      return { events: [ctx.message(ctx.actor, [
        `${plural(matched.length, "match", "matches")} for ${words.join(" ")}${matched.length > LOCATED ? `; the first ${LOCATED}` : ""}:`,
        ...ordered.slice(0, LOCATED).map((f) => `  ${f.kind}: ${f.name} — travel ${f.path ?? f.room}`),
        "Type travel <path> to go there, then look.",
      ].join("\n"))] };
    },
    travel: (ctx) => {
      const target = ctx.argument.trim().replace(/\/+$/u, "");
      if (target === "") return { events: [ctx.message(ctx.actor, "Travel where? Type travel <section path or name>, or travel plaza.")] };
      const lower = target.toLowerCase();
      const sections = findings(ctx.world).filter((f) => f.kind === "section");
      const exact = lower === "plaza" || lower === PLAZA ? [{ id: PLAZA }] : sections.filter((f) => f.id === lower || f.path === target);
      const candidates = exact.length > 0 ? exact : sections.filter((f) => f.path?.endsWith(`/${target}`) || f.name.toLowerCase() === lower || slug((f.path ?? f.id).split("/").pop()) === slug(lower));
      if (candidates.length === 0) return { events: [ctx.message(ctx.actor, `No section is at ${target}. Type locate ${target} to search for it.`)] };
      if (candidates.length > 1) return { events: [ctx.message(ctx.actor, [`Several sections answer to ${target}; travel to one by its path:`, ...candidates.slice(0, LOCATED).map((f) => `  ${f.path}`)].join("\n"))] };
      const room = candidates[0].id;
      if (placeOf(ctx.world, ctx.actor) === room) return { events: [ctx.message(ctx.actor, `You are already at ${roomName(ctx.world, room)}. Type look to see it.`)] };
      const here = contentsOf(ctx.world, room).map(id => certainValue(ctx.world, id, "name") ?? id);
      return {
        world: move(ctx.world, ctx.actor, room, { source: `${CAPABILITY}.travel` }),
        events: [ctx.message(ctx.actor, [
          `You travel to ${roomName(ctx.world, room)}.`, certainValue(ctx.world, room, "description"),
          here.length > 0 ? `Here: ${here.join("; ")}.` : "",
          `Exits: ${exitsOf(ctx.world, room).map(exit => exit.direction).join(", ")}.`,
        ].filter(Boolean).join("\n"))],
      };
    },
    report: (ctx) => {
      const { offices } = standingIn(ctx.world, ctx.actor);
      if (offices.length === 0) return { events: [ctx.message(ctx.actor, "You hold no office here. Ask the office that seats others to admit you, or look around the plaza.")] };
      const room = certainValue(ctx.world, offices[0], "located-in");
      if (certainValue(ctx.world, room, "kind") !== "room") return { events: [ctx.message(ctx.actor, "Your office has no settled room to report to.")] };
      if (placeOf(ctx.world, ctx.actor) === room) return { events: [ctx.message(ctx.actor, `You are already at ${roomName(ctx.world, room)}.`)] };
      return { world: move(ctx.world, ctx.actor, room, { source: `${CAPABILITY}.report` }), events: [ctx.message(ctx.actor, `You report to ${roomName(ctx.world, room)}, where ${roomName(ctx.world, offices[0])} stands.`)] };
    },
    read: (ctx) => {
      const [name, pageToken] = (() => {
        const words = ctx.argument.trim().split(/\s+/u).filter(Boolean);
        return /^\d+$/u.test(words.at(-1) ?? "") ? [words.slice(0, -1).join(" "), Number(words.at(-1))] : [words.join(" "), null];
      })();
      if (name === "") return { events: [ctx.message(ctx.actor, "Read what? Type look to see what is here.")] };
      const room = placeOf(ctx.world, ctx.actor);
      const needle = name.toLowerCase();
      const book = contentsOf(ctx.world, room).find((id) => values(ctx.world, id, "tag").includes("book")
        && (needle === "book" || values(ctx.world, id, "slug").includes(needle) || roomName(ctx.world, id).toLowerCase() === needle || id.endsWith(`.${segment(needle)}`)));
      if (book === undefined) {
        const skills = contentsOf(ctx.world, room).filter((id) => values(ctx.world, id, "tag").includes("skill")
          && (values(ctx.world, id, "slug").includes(name) || values(ctx.world, id, "skill-key").includes(name) || roomName(ctx.world, id).toLowerCase() === needle));
        if (skills.length === 0) return { events: [ctx.message(ctx.actor, `There is no ${name} to read here.`)] };
        if (skills.length > 1) return { events: [ctx.message(ctx.actor, `Several skills are named ${name}. Read one by its qualified name:\n${skills.flatMap((id) => values(ctx.world, id, "skill-key")).join("\n")}`)] };
        const skill = skills[0], method = certainValue(ctx.world, skill, "method");
        if (method === null) return { events: [ctx.message(ctx.actor, "No settled method is recorded for this skill.")] };
        if (pageToken !== null) return { events: [ctx.message(ctx.actor, `A skill is a method, not a numbered chapter. Type read ${name}.`)] };
        return { events: [ctx.message(ctx.actor, [
          roomName(ctx.world, skill), `Source: ${method.source}`,
          `Closure: ${method.closureKind ?? "not declared"}`,
          `Requires: ${(method.requires ?? []).join(", ") || "none declared"}`,
          "Reading this method grants no authority to execute it.",
          typeof method.text === "string" && method.text.trim() !== "" ? method.text.trim() : "No authored method is recorded.",
        ].join("\n\n"))] };
      }
      const pages = [...values(ctx.world, book, "page")].sort((a, b) => a.n - b.n);
      if (pageToken === null) {
        return { events: [ctx.message(ctx.actor, [`${roomName(ctx.world, book)}`, ...pages.map((p) => `  ${p.n}. ${p.title}`), `Type read ${name} <number> to read a chapter.`].join("\n"))] };
      }
      const page = pages.find((p) => p.n === pageToken);
      return { events: [ctx.message(ctx.actor, page === undefined ? `${roomName(ctx.world, book)} has no chapter ${pageToken}.` : chapterText(page.file))] };
    },
    powers: (ctx) => {
      const { offices, verbs: granted } = standingIn(ctx.world, ctx.actor);
      const projection = affordances(ctx.actor);
      const line = (entry) => `  ${entry.verb}${entry.summary ? ` — ${entry.summary}` : ""}${entry.scope ? ` [scope: ${entry.scope}]` : ""}`;
      return { events: [ctx.message(ctx.actor, [
        offices.length === 0 ? "You hold no office here." : `Your offices: ${offices.map((id) => roomName(ctx.world, id)).join("; ")}.`,
        ...operationAffordanceCategories.filter((category) => projection[category]?.length).flatMap((category) => [
          `${category[0].toUpperCase()}${category.slice(1)} operations (type a power, then its input as key=value pairs or JSON):`,
          ...projection[category].map(line),
        ]),
        ...(granted.size === 0 && !operationAffordanceCategories.some((category) => projection[category]?.length) ? ["No installed operation is currently allowed."] : []),
        "Type help <operation> for its input and output contract.",
      ].join("\n"))] };
    },
    help: (ctx) => {
      const target = ctx.argument.trim();
      if (target === "read") return { events: [ctx.message(ctx.actor, [
        "read <book> [chapter], read <skill>",
        "Read a book or authored skill in your current room. Use look to list what is here.",
        "For a book, omit the chapter number to list chapters; add its number to read that chapter. A skill has no numbered chapters; reading its method grants no authority to execute it.",
        "For an office, use look <full displayed name> or examine <full displayed name> in its room (for example, look the office of Researcher). These show the short description, not the complete office record.",
      ].join("\n\n"))] };
      const projection = affordances(ctx.actor);
      const entries = operationAffordanceCategories.flatMap((category) => (projection[category] ?? []).map((entry) => ({ ...entry, category })));
      if (target === "") return { events: [ctx.message(ctx.actor, [
        "The city's commands:",
        ...WORLD_COMMANDS.map((line) => `  ${line}`),
        "Installed operations (availability is separate from discovery):",
        ...[...verbs.values()].map((op) => `  ${op.verb} (${entries.some((entry) => entry.verb === op.verb) ? "available" : "requires standing"})${op.summary ? ` — ${op.summary}` : ""}`),
        "Type help <operation> for schema details.",
      ].join("\n"))] };
      const matches = entries.filter((candidate) => candidate.verb === target);
      const operation = verbs.get(target);
      if (operation === undefined) return { events: [ctx.message(ctx.actor, `${target} is not installed. Use operations to discover installed families.`)] };
      const descriptor = operation === undefined ? matches[0] : operationDescriptor(operation);
      return { events: [ctx.message(ctx.actor, [
        `${target} (${matches.length ? matches.map((entry) => `${entry.category}${entry.scope === undefined ? "" : `: ${entry.scope}`}`).join("; ") : "requires standing"})`,
        descriptor.summary ?? "No summary is declared.",
        ...(typeof descriptor.description === "string" && descriptor.description.trim() !== ""
          && descriptor.description.trim() !== descriptor.summary?.trim()
          ? [`Contract:\n${descriptor.description.trim()}`] : []),
        `Input schema:\n${JSON.stringify(descriptor.domain?.schema ?? {}, null, 2)}`,
        `Output schema:\n${JSON.stringify(descriptor.codomain?.schema ?? {}, null, 2)}`,
        `Operation reference: ${descriptor.ref}`,
      ].join("\n\n"))] };
    },
  };
  return defineCapability({ id: CAPABILITY, commands });
}

const summarize = (value) => {
  const text = JSON.stringify(value);
  return text.length > 1500 ? `${text.slice(0, 1497)}...` : text;
};

/**
 * One running world over a MetroPlat binding. `operations()` yields the catalog's operations
 * (read lazily, since the world's own operations are part of that catalog).
 */
export function createMetroplatWorld({ binding, operations, identity, characterCommunication, actorMesh, now = Date.now }) {
  let state, building;
  const build = async () => {
    const root = agencyRootOf(binding);
    const agency = agencyAt(root);
    const seats = new Map();
    const holders = new Set([...readIncumbencyClaims(binding.dataRoot).map((c) => c.incumbent), ...readCharacterMasks(binding.dataRoot).map((m) => m.account)]);
    for (const holder of holders) seats.set(holder, officesOfAccount(binding, holder, agency).map((o) => o.office));
    const catalog = new Map(operations().filter((op) => !ENTRYPOINTS.has(op.verb)).map((op) => [op.verb, op]));
    const game = metroplatGame(agency, { root, seats, identity });
    const actors = new Map();
    // Delegated powers change with the duty frontier, so they are read live, never seated.
    const affordances = (actor, operation) => {
      const subject = [...actors].find(([, character]) => actorIdFor(character) === actor)?.[0] ?? actor;
      return projectOperationAffordances(operation === undefined ? [...catalog.values()] : [operation], readStanding(binding, subject), subject);
    };
    const world = { agency, game, actors, root, affordances };
    const server = createMudServer(game, { runtime: composeCapabilities([worldCapability({ verbs: catalog, affordances, work: workOf(world) })]) });
    state = Object.assign(world, { server });
    return state;
  };
  // The section tree is read once per release; a world is built once and reused until the agency changes.
  const current = async () => state ?? (building ??= build().finally(() => { building = undefined; }));
  const situationOf = (world, actor) => {
    const place = world.server.situatedActions(actor), projection = world.affordances(actor);
    const powers = operationAffordanceCategories.flatMap(category => (projection[category] ?? []).map(power => Object.freeze({ command: power.verb, description: power.summary ?? power.verb, ref: power.ref, ...(power.scope === undefined ? {} : { scope: power.scope }) })));
    return Object.freeze({ ...place, actions: Object.freeze([...place.actions, ...powers]) });
  };
  // The character an account enters as: its first settled mask, else itself.
  const characterOf = (account) => providersOfAccount(binding, account)[1] ?? account;
  let pulse, tellings, quests;
  // The house's work as a built world tells it: one placement per world, and the tellings and the
  // board's quests read through it. What a command showed as data waits for its turn here.
  const stashed = new Map();
  const heardTo = new Map();
  const placesOf = (world) => worldPlaces({ world: world.server.engine().world, agency: world.agency, plaza: PLAZA, characterName: (player) => characterNameIn(world.agency, player) });
  const workOf = (world) => Object.freeze({
    places: () => placesOf(world),
    tellings: () => (tellings ??= createTellings({ dataRoot: binding.dataRoot })).read(placesOf(world)),
    quests: (quests ??= createQuests({ binding, agency: () => agencyAt(agencyRootOf(binding)) })),
    stash: (actor, entry) => stashed.set(actor, [...(stashed.get(actor) ?? []), Object.freeze(entry)]),
    journalOf: (actor) => journalOf(world, accountOf(world, actor)),
    journalPage: (journal, options) => journalPage(world, journal, options),
  });
  // The account a character of a built world was entered for.
  const accountOf = (world, actor) => [...world.actors].find(([, character]) => actorIdFor(character) === actor)?.[0];
  // The players an account's character plays as on the work board: the account, the character and
  // the offices it holds (its own), and the micro-enterprises seating those offices (the houses it serves).
  const playersOf = (world, account) => {
    if (account === undefined) return { players: [], houses: [] };
    const character = world.actors.get(account) ?? characterOf(account);
    const offices = officesOfAccount(binding, account, world.agency).map(({ office }) => office);
    const held = new Set(offices.map((office) => canonicalPlayer(world.agency, office)));
    const houses = [...world.agency.enterprises.values()]
      .filter((record) => (record.offices ?? []).some((office) => held.has(resolve(world.agency, "offices", office, record.sectionPath)?.key ?? office)))
      .map((record) => record.id);
    const players = [...new Set([account, typeof character === "string" ? character : character?.id, ...offices])].filter((player) => typeof player === "string");
    return { players, houses };
  };
  const journalOf = (world, account) => {
    const { players, houses } = playersOf(world, account);
    const owed = workOf(world).quests.journal([...players, ...houses], placesOf(world));
    return { players, houses, own: owed.filter((entry) => !houses.includes(entry.as)), house: owed.filter((entry) => houses.includes(entry.as)) };
  };
  // One page of a journal as data (Work.Journal): its own threads and, with `all`, its houses',
  // each player in it named as the city names it.
  const journalPage = (world, { own, house, houses }, { page = 1, all = false } = {}) => {
    const skip = (page - 1) * QUESTS;
    const shownOwn = own.slice(skip, skip + QUESTS), shownHouse = all ? house.slice(skip, skip + QUESTS) : [];
    const { nameOf } = placesOf(world);
    const named = new Set([...houses, ...shownOwn.map((entry) => entry.as), ...shownHouse.map((entry) => entry.as)]);
    return Object.freeze({ page, total: own.length, own: shownOwn, houses, houseTotal: house.length, house: shownHouse,
      names: Object.freeze(Object.fromEntries([...named].map((player) => [player, nameOf(player)]))) });
  };
  // A character's first turn opens with its journal, in a line.
  const briefing = (world, account) => {
    const journal = journalOf(world, account);
    const { own, house, houses } = journal;
    const theirs = listOf(houses.map(placesOf(world).nameOf));
    const line = own.length + house.length === 0 ? "Nothing on the work board awaits your move."
      : `Your journal: ${plural(own.length, "thread")} await${own.length === 1 ? "s" : ""} your move${house.length === 0 ? "" : `; ${house.length} more await ${theirs}`}. Type journal.`;
    return { lines: [line], packages: [Object.freeze({ name: "Work.Journal", data: journalPage(world, journal) })] };
  };
  // What was told around a character since its account's last turn (on its first, the latest
  // told there), as one message and as data.
  const overheard = (world, account, actor) => {
    const told = workOf(world).tellings();
    const room = placeOf(world.server.engine().world, actor) ?? PLAZA;
    const since = heardTo.get(account);
    heardTo.set(account, told.seq);
    const reading = tellingsReading(told, { since: since ?? 0, room, hears: placesOf(world).hears, limit: since === undefined ? 5 : Infinity });
    if (reading.tellings.length === 0) return { lines: [], packages: [] };
    const shown = reading.tellings.slice(-OVERHEARD);
    const name = (at) => certainValue(world.server.engine().world, at, "name") ?? at;
    return {
      lines: [[since === undefined ? `Lately ${room === PLAZA ? "in the city" : "here"}:` : "Meanwhile:",
        ...shown.map((telling) => `  [${telling.handle}] ${telling.prose}${telling.room === room ? "" : ` (at ${name(telling.room)})`}`),
        ...(reading.tellings.length > shown.length ? [`  …and ${reading.tellings.length - shown.length} more; type tellings.`] : []),
      ].join("\n")],
      packages: [Object.freeze({ name: "Work.Tellings", data: reading })],
    };
  };
  // The city's people: who is present, what each is called, and the verbs the world answers
  // itself (world-people.mjs). Presence expires after PRESENCE_TTL; one name function serves
  // who, tell, look, emote, the pulse and the tellings.
  const presence = createPresence({ now });
  const nameOfCharacter = (agency, character) => characterNameIn(agency, character) ?? (String(character).startsWith("actor:") ? shortId(character) : String(character));
  const nameOfActor = (world, actor) => {
    const here = presence.get(actor);
    if (here !== undefined) return here.name;
    const character = [...world.actors.values()].find((held) => actorIdFor(held) === actor);
    return character === undefined ? shortId(actor) : nameOfCharacter(world.agency, character);
  };
  const controlOf = (world) => (world.control ??= createControlTable({
    presence, now, nameOf: (actor) => nameOfActor(world, actor),
    roomOf: (actor) => placeOf(world.server.engine().world, actor) ?? PLAZA,
    roomName: (room) => roomNameIn(world, room),
    witnesses: (actor) => {
      const engine = world.server.engine();
      const room = placeOf(engine.world, actor);
      return witnessesOf(engine.world, actor, presence.page({ room, limit: WHO_MAX }).people.map((entry) => entry.actor));
    },
    deliver: (actor, text, channel = "system") => world.server.pushEvent(actor, message(actor, text, channel)),
    stash: (actor, entry) => workOf(world).stash(actor, entry),
    // A tell leaves mail in the character's body; the records go to the node's body journal.
    tellMail: (record) => tellBodyRecords(binding.dataRoot, [record], { at: record.at, caller: { transport: "world-tell" } }),
    characterNamed: (name) => characterRecordNamed(world.agency, name),
  }));
  // Note that the account's character was seen now, where it stands.
  const seen = (world, account, actor) => presence.see(actor, { account, character: world.actors.get(account), name: nameOfCharacter(world.agency, world.actors.get(account)),
    room: placeOf(world.server.engine().world, actor) ?? PLAZA });
  // Whoever has been away longer than the TTL leaves the city, and its session with it.
  const sweep = (world) => {
    for (const entry of presence.expire()) {
      world.server.disconnect(entry.actor);
      if (world.actors.get(entry.account) === entry.character) world.actors.delete(entry.account);
    }
  };
  const verbOf = (line) => /^(\S+)\s*(.*)$/su.exec(String(line).trim())?.slice(1, 3) ?? ["", ""];

  // Where the house's work happens in a built world: its rooms, offices and enterprises, and where
  // each connected character stands.
  const sitesOf = (world) => pulseSites({ world: world.server.engine().world, agency: world.agency, root: world.root, characterOf,
    characterName: (character) => nameOfCharacter(world.agency, character),
    standing: (account) => {
      const character = world.actors.get(account);
      return character === undefined ? undefined : placeOf(world.server.engine().world, actorIdFor(character)) ?? undefined;
    } });

  /** Invoke an installed catalog power from the account's current standing without a world turn. */
  async function directPower(account, line, parent) {
    let source = String(line).trim();
    const realm = /^@([^\s]+)\s+(.+)$/su.exec(source);
    const enterprise = realm?.[1];
    if (realm !== null) source = realm[2];
    const separator = source.search(/\s/u);
    const verb = (separator < 0 ? source : source.slice(0, separator)).toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/u.test(verb) || RESERVED.has(verb) || ENTRYPOINTS.has(verb)) return undefined;
    const catalog = new Map(operations().filter((op) => !ENTRYPOINTS.has(op.verb)).map((op) => [op.verb, op]));
    const selected = catalog.get(verb);
    if (selected === undefined) return undefined;
    const argument = separator < 0 ? "" : source.slice(separator).trimStart();
    let input;
    try { input = readPowerInput(argument, selected.domain?.schema); }
    catch (error) {
      return powerTurn(account, [`${verb} takes key=value pairs or JSON (${error.message}), for example: ${verb} market=duluth limit=20`]);
    }
    return usePower(account, { verb, input, enterprise }, parent);
  }

  /** A turn of the account's character that only says `messages` (and carries `results`). */
  function powerTurn(account, messages, results = []) {
    const character = characterOf(account);
    return Object.freeze({ kind: "metroplat.world.turn", actor: actorIdFor(character), character,
      messages: Object.freeze(messages), results: Object.freeze(results) });
  }

  /**
   * Use an installed power with its input from the account's current standing, without a world
   * turn; `setting` is how the character is told it sets about it.
   */
  async function usePower(account, { verb, input: given, enterprise }, parent, setting = `You set about ${verb}.`) {
    let input = given;
    const selected = operations().find((op) => op.verb === verb && !ENTRYPOINTS.has(op.verb));
    const actor = actorIdFor(characterOf(account));
    const turn = (messages, results = []) => powerTurn(account, messages, results);
    if (selected === undefined) return turn([`${verb} is not installed here. Type powers to see current operations.`]);
    // A quest's handle names its thread, as a MUD expands a target's abbreviation.
    if (typeof input?.thread === "string" && !input.thread.startsWith("ni:")) {
      const world = await current();
      const named = workOf(world).quests.named(input.thread, placesOf(world));
      if (named.length > 1) return turn([`Several threads answer to ${input.thread}; name one by its id: ${named.map((thread) => thread.id).join(", ")}`]);
      if (named.length === 1) input = { ...input, thread: named[0].id };
    }
    const projection = projectOperationAffordances([selected], readStanding(binding, account, { operation: selected, input }), account);
    const entries = operationAffordanceCategories.flatMap((category) => projection[category] ?? []);
    if (!entries.some((entry) => entry.verb === verb
      && (entry.scope === undefined || selected.locus === undefined || entry.scope === input?.[selected.locus]))) {
      return turn([`${verb} is not currently available to this account. Type powers to see current operations.`]);
    }
    const request = { operation:selected.ref, verb, input,
      ...(enterprise === undefined ? {} : { enterprise }) };
    const messages = [setting];
    try {
      if(!actorMesh)throw new Error('this host has no running actor mesh');
      const submission=await actorMesh.submit(account,request,{admit:()=>{
        const currentOperation=operations().find(operation=>operation.ref===selected.ref&&operation.verb===verb);
        const standing=currentOperation===undefined?[]:projectOperationAffordances([currentOperation],readStanding(binding,account,{operation:currentOperation,input}),account);
        const currentEntries=operationAffordanceCategories.flatMap(category=>standing[category]??[]);
        if(!currentEntries.some(entry=>entry.verb===verb&&(entry.scope===undefined||currentOperation.locus===undefined||entry.scope===input?.[currentOperation.locus])))throw new Error('current operation or office standing was withdrawn before sending');
      }});
      messages.push(`Submitted ${verb} to ${submission.recipient}. Type messages for its reply.`);
      return turn(messages,[{verb,submitted:true,request:submission.request,recipient:submission.recipient}]);
    } catch (error) {
      messages.push(`${verb} failed: ${error.message}`);
      return turn(messages, [{ verb, ok: false, error: error.message }]);
    }
  }

  /**
   * A line that plays the arena: `<move> <handle> ...` plays a response move on the thread the handle
   * names (work-move), `post <opening> ...` opens a thread about the room the character stands in
   * (work-open); anything else is not one (undefined), and the world's own commands and the powers
   * read it. An acceptance or a rejection names the delivery awaiting its verdict when only one does.
   * `supersede <handle> ...` is its opener saying a thread again, better (an unframed aim restated
   * with what it lacked): a new opening of its kind superseding it, saying what it said but what is given.
   */
  async function playedMove(account, line, parent) {
    const [, word = "", target = "", rest = ""] = /^(\S+)(?:\s+(\S+))?(?:\s+(.*))?$/su.exec(String(line).trim()) ?? [];
    const verb = word.toLowerCase(), kind = target.toLowerCase();
    const said = (field) => {
      try { return readSaidInput(rest, field); }
      catch (error) { return error; }
    };
    if (verb === "post") {
      if (!OPENING_MOVES.includes(kind)) return powerTurn(account, [`Post what? post <${OPENING_MOVES.join("|")}> <words> [key=value ...]`]);
      const input = said(SAID[kind]);
      if (input instanceof Error) return powerTurn(account, [`post ${kind} takes words and key=value pairs (${input.message}).`]);
      const world = await current();
      const character = world.actors.get(account);
      const room = character === undefined ? undefined : placeOf(world.server.engine().world, actorIdFor(character));
      const section = room === undefined ? undefined : placesOf(world).sectionOf(room);
      const scoped = input.scope === undefined && section !== undefined ? { scope: [`section:${section}`] } : {};
      return usePower(account, { verb: "work-open", input: { move: kind, ...scoped, ...input } }, parent,
        `You post ${kind === "aim" ? "an aim" : `a ${kind}`}${section === undefined ? "" : ` about ${roomNameIn(world, room)}`}.`);
    }
    // A move verb an installed power also answers to is that power's unless a thread follows it.
    if (!MOVE_VERBS.has(verb) && verb !== "supersede") return undefined;
    const theirs = operations().some((op) => op.verb === verb);
    if (target === "") return theirs ? undefined : powerTurn(account, [`${verb[0].toUpperCase()}${verb.slice(1)} which thread? ${verb} <handle> [words] [key=value ...]; type journal or quests to find one.`]);
    const world = await current();
    const places = placesOf(world);
    const named = workOf(world).quests.named(target, places);
    if (named.length === 0) return theirs ? undefined : powerTurn(account, [`No thread on the work board answers to ${target}. Type journal or quests to find one.`]);
    if (named.length > 1) return powerTurn(account, [`Several threads answer to ${target}; name one by its id: ${named.map((thread) => thread.id).join(", ")}`]);
    const [thread] = named;
    let input = said(SAID[verb === "supersede" ? thread.opening.move : verb]);
    if (input instanceof Error) return powerTurn(account, [`${verb} takes words and key=value pairs after the thread (${input.message}).`]);
    if (verb === "supersede") {
      if (Object.keys(input).length === 0) return powerTurn(account, [`Supersede [${target}] with what? supersede ${target} <what it says now> [key=value ...], or {json}.`]);
      const { id: _id, by: _by, at: _at, hand: _hand, supersedes: _earlier, ...opened } = thread.opening;
      return usePower(account, { verb: "work-open", input: { ...opened, ...input, move: thread.opening.move, supersedes: [thread.id] } }, parent,
        `You say [${target}] again: «${clip(threadSummary(thread).gist, 72)}».`);
    }
    if (verb === "argue" && input.stance === undefined) {
      const [, stance, says] = /^(for|against)\b\s*(.*)$/isu.exec(input.says ?? "") ?? [];
      if (stance === undefined) return powerTurn(account, [`Argue for or against? argue ${target} for|against <what you say>`]);
      input = { ...input, stance: stance.toLowerCase(), says };
    }
    if ((verb === "accept" || verb === "reject") && input.of === undefined && thread.opening.move === "request") {
      const awaiting = [...new Set(deliveriesToAssay({ threads: [thread] }, () => true).map((entry) => entry.delivery.player))];
      if (awaiting.length !== 1) return powerTurn(account, [awaiting.length === 0 ? `No delivery on [${target}] awaits a verdict.` : `Whose delivery? ${verb} ${target} of=<player>: ${awaiting.join(", ")}`]);
      input = { ...input, of: awaiting[0] };
    }
    return usePower(account, { verb: "work-move", input: { ...input, thread: thread.id, move: verb } }, parent,
      `You ${verb} [${target}] «${clip(threadSummary(thread).gist, 72)}».`);
  }
  const receivedLines = (messages) => messages.map(message =>
    `${message.id} from ${message.sender}: ${message.value?.text ?? summarize(message.value)}`);
  async function communicationTurn(account, line, parent) {
    const [verb, argument] = verbOf(line);
    const [target] = argument.trim().split(/\s+/u);
    const federatedTell = verb === "tell" && /^(?:@|https?:\/\/)/u.test(target);
    if (verb !== "inbox" && verb !== "reply" && !federatedTell) return undefined;
    if (characterCommunication === undefined) return powerTurn(account, ["This node's character communication resource is unavailable."]);
    const at = new Date(now()).toISOString();
    let result;
    if (verb === "inbox") {
      if (argument.trim() && argument.trim() !== "all") return powerTurn(account, ["inbox [all]: read your own received messages."]);
      result = await characterCommunication.read({ account, evidence: parent?.id, at, all: argument.trim() === "all" });
      return powerTurn(account, result.messages.length === 0 ? [argument.trim() === "all" ? "No Semioverse messages received." : "No unread Semioverse messages."] : receivedLines(result.messages), [result]);
    }
    const text = argument.slice(target.length).trim();
    result = verb === "reply"
      ? await characterCommunication.reply({ account, id: target, text, at })
      : await characterCommunication.tell({ account, recipient: target, text, at });
    return powerTurn(account, [`Submitted ${result.id} to ${result.recipient}; remote reading awaits evidence.`], [result]);
  }
  const roomNameIn = (world, room) => certainValue(world.server.engine().world, room, "name") ?? room;

  // A drawing client asks for the character's perception frame with its turn; a reading one does
  // not carry it.
  async function run(world, account, actor, { frame = false } = {}) {
    const { server, actors } = world;
    const events = [...server.drain(actor)];
    const shown = stashed.get(actor) ?? [];
    stashed.delete(actor);
    const brief = heardTo.has(account) ? { lines: [], packages: [] } : briefing(world, account);
    const heard = overheard(world, account, actor);
    const packages = [...shown, ...brief.packages, ...heard.packages];
    return Object.freeze({ kind: "metroplat.world.turn", actor, character: actors.get(account),
      messages: Object.freeze([...events.map((e) => e.text), ...brief.lines, ...heard.lines]), results: Object.freeze([]),
      ...(packages.length === 0 ? {} : { packages: Object.freeze(packages) }),
      situation: situationOf(world, actor),
      ...(frame ? { frame: worldFrame(server.engine(), actor, situationOf(world, actor)) } : {}) });
  }

  return Object.freeze({
    /** Enter the world as the account's character, and report to its office. */
    async connect(account, parent, options = {}) {
      const world = await current();
      const { server, actors } = world;
      const character = characterOf(account);
      const actor = actorIdFor(character);
      server.connect(character, { name: nameOfCharacter(world.agency, character) });
      actors.set(account, character);
      heardTo.delete(account);
      sweep(world);
      server.enqueue(actor, "report");
      server.enqueue(actor, "look");
      server.tick();
      seen(world, account, actor);
      controlOf(world).look.run({ actor, argument: "" });
      const turn = await run(world, account, actor, options);
      const inbox = await characterCommunication?.read({ account, evidence: parent?.id, at: new Date(now()).toISOString(), optional: true });
      if (inbox === undefined) return turn;
      return Object.freeze({ ...turn,
        messages: Object.freeze([...turn.messages, "Semioverse messages are testimony; reply <exact-message-id> <words>, inbox [all].", ...receivedLines(inbox.messages)]),
        results: Object.freeze([...turn.results, inbox]),
      });
    },
    /** Speak one command line as the account's character. */
    async command(account, line, parent, options = {}) {
      const [meshVerb,meshArgument]=verbOf(line);
      if(meshVerb==='message'||meshVerb==='messages'){
        try{
          if(!actorMesh)throw new Error('this host has no running actor mesh');
          if(meshVerb==='message'){
            const parsed=/^(\S+)\s+([\s\S]+)$/u.exec(meshArgument);
            if(!parsed)throw new Error('message <actor@instance> <words or request JSON>');
            const submission=await actorMesh.send(account,parsed[1],parsed[2]);
            return Object.freeze({...powerTurn(account,[`Submitted to ${submission.recipient}. Type messages for replies.`]),packages:[{name:'Comm.Submission',data:submission}]});
          }
          const inbox=await actorMesh.read(account,meshArgument.trim()||undefined);
          if(inbox.items.some(entry=>entry.kind==='metroplat.dispatch.result'&&entry.value.result?.code===0&&BOARD_MOVES.test(entry.value.result.verb)))quests?.forget();
          return Object.freeze({...powerTurn(account,inbox.items.length?inbox.items.map(entry=>`${entry.sender}: ${entry.text}`):['No messages.']),packages:[{name:'Comm.Inbox',data:inbox}]});
        }catch(error){return powerTurn(account,[error.message]);}
      }

      const direct = await communicationTurn(account, line, parent) ?? await playedMove(account, line, parent) ?? await directPower(account, line, parent);
      if (direct !== undefined) {
        if (state?.actors.has(account)) seen(state, account, direct.actor);
        if (state === undefined || !state.actors.has(account)) return direct;
        return Object.freeze({ ...direct, situation: situationOf(state, direct.actor), ...(options.frame ? { frame: worldFrame(state.server.engine(), direct.actor, situationOf(state, direct.actor)) } : {}) });
      }
      if (state && state.agency !== agencyAt(agencyRootOf(binding))) state = undefined;
      const world = await current();
      const { server, actors } = world;
      if (!actors.has(account)) await this.connect(account, parent);
      const actor = actorIdFor(actors.get(account));
      sweep(world);
      // The control-plane verbs are answered here; only engine verbs go to the engine.
      const [verb, argument] = verbOf(line);
      const control = Object.hasOwn(controlOf(world), verb.toLowerCase()) ? controlOf(world)[verb.toLowerCase()] : undefined;
      const alongside = control?.alongside?.(argument) === true;
      if (control === undefined || control.alongside !== undefined) {
        server.enqueue(actor, line);
        server.tick();
      }
      seen(world, account, actor);
      if (control !== undefined && (control.alongside === undefined || alongside)) control.run({ actor, argument });
      return run(world, account, actor, options);
    },
    /** The whole city as data, for a client to draw; the same for every account. */
    async atlas() {
      const world = await current();
      return worldAtlas(world.game, world.server.engine().world);
    },
    /** The house at work: who is doing what where, and how warm each room is, since `since`. */
    async pulse(since = 0) {
      const world = await current();
      pulse ??= createPulse({ dataRoot: binding.dataRoot });
      return pulse.read(sitesOf(world), since);
    },
    /** What the work arena told since `since`, heard in `room` (a room id or section path) or on `thread` (an id or handle). */
    async tellings({ since = 0, room, thread, limit } = {}) {
      const world = await current();
      const places = placesOf(world);
      const at = room === undefined ? undefined : certainValue(world.server.engine().world, room, "kind") === "room" ? room : places.roomAt(room);
      if (room !== undefined && at === undefined) throw new TypeError(`world-tellings: no room is at ${room}`);
      return tellingsReading(workOf(world).tellings(), { since, room: at, thread, hears: places.hears, ...(limit === undefined ? {} : { limit }) });
    },
    /** What awaits the account's character's move on the work board: its journal's first page. */
    async journal(account) {
      const world = await current();
      return journalPage(world, journalOf(world, account));
    },
    /** Rebuild the world from the agency records (after offices, seats or masks change). */
    async rebuild() { state = undefined; return (await current()).game.id; },
  });
}

/** The agency's character a reference names (id, key or name, name ignoring case): `{ id, name }`. */
function characterRecordNamed(agency, ref) {
  if (typeof ref !== "string" || ref === "") return undefined;
  const lower = ref.toLowerCase();
  // A tell names one word, so a unique first name or key also names the character.
  const whole = [...agency.characters.values()].filter((held) => [held.key, held.name].some((word) => String(word ?? "").toLowerCase() === lower));
  const first = whole.length > 0 ? whole : [...agency.characters.values()].filter((held) => String(held.name ?? "").toLowerCase().split(/\s+/u)[0] === lower);
  const record = resolve(agency, "characters", ref) ?? (first.length === 1 ? first[0] : undefined);
  return record === undefined ? undefined : Object.freeze({ id: record.id, name: typeof record.name === "string" ? record.name : record.id });
}

/** A character's name in the agency's cast (a character, else a mask), when the cast names it. */
function characterNameIn(agency, character) {
  if (typeof character !== "string") return undefined;
  const record = resolve(agency, "characters", character) ?? resolve(agency, "masks", character);
  return typeof record?.name === "string" && record.name !== character ? record.name : undefined;
}

const turnContract = schemaFrom({ $id: "metroplat/world/turn", title: "WorldTurn", type: "object", required: ["kind", "actor", "messages", "results"], properties: { kind: { const: "metroplat.world.turn" }, actor: { type: "string" }, character: { type: "string" }, messages: { type: "array", items: { type: "string" } }, results: { type: "array" }, packages: { type: "array", items: { type: "object", required: ["name", "data"], properties: { name: { type: "string" }, data: {} } }, description: "What the turn showed, as data under a GMCP-style package name: Work.Quests, Work.Quest, Work.Journal (what awaits the character's move; on its first turn too), Work.Tellings (what was told around the character since its last turn)." }, frame: { type: "object", description: "The character's FeltOS perception frame, when asked for." } } });

/** The world's operations: connect as your character, speak commands, and read the city's atlas, pulse and tellings, and your journal. */
export function worldOperations(binding, operations, identity, { characterCommunication,actorMesh } = {}) {
  let world;
  const instance = () => (world ??= createMetroplatWorld({ binding, operations, identity, characterCommunication,actorMesh }));
  // A power used from a command is caused by that command's witnessed evidence, never by its
  // invocation id: an invocation is an entity, not a witness, and a cause that is no witness is
  // never admitted, so everything that names it waits forever.
  // A command's parent carries the hand it came through, so the powers it uses are played by that hand too.
  const callerOf = (context) => (context?.invocation === undefined ? undefined
    : Object.freeze({ id: context.invocation.id, evidence: Object.freeze([...(context.evidence ?? [])]),
      ...(typeof context.invocation.caller?.hand === "string" ? { hand: context.invocation.caller.hand } : {}) }));
  return Object.freeze([
    operation({
      verb: "world-connect",
      summary: "Enter this organization's world as your character: report to your office and look around.",
      description: "Domain: {}. You enter as the character your account masks (or as yourself), go to your office's room, and see it: the offices there, who is present, the exits. Then speak commands with world-command.",
      domain: schemaFrom({ $id: "metroplat/world/connect", title: "WorldConnect", type: "object", properties: { frame: { type: "boolean", description: "Also return the character's perception frame, for a client that draws the world." } }, additionalProperties: false }),
      codomain: turnContract,
      writes: ["world"],
      run: (input, _args, context) => instance().connect(subjectOf(context, "anonymous"), callerOf(context), { frame: input?.frame === true }),
    }),
    operation({
      verb: "world-command",
      summary: "Speak one MUD command in the world as your character (look, go <exit>, locate <words>, travel <section>, read <book or skill>, quests, quest <handle>, journal, tellings, say, who, tell, help, powers, report, or one of your powers with JSON input).",
      description: "Domain: { line }. The line is a MUD command. Every services section of the house is a room showing what it holds (its README, package, books, skills, offices, and a census of its content, code and data); `locate <words>` finds sections and things anywhere, and `travel <section path>` goes straight to one. Your powers are the operation verbs your offices grant; type `powers` to list them and `<power> key=value ...` (or `<power> {json input}`) to use one. The work board is the city's work: `quests` lists the open threads placed in your room and the rooms it encloses (in the plaza, the town's pressing ones), `quest <handle>` reads one with who owes which move, `journal` lists what awaits your own move (your first turn opens with it), `<move> <handle> [words] [key=value ...]` plays an arena move on a thread (`accept 318O_7rq`, `decline <handle> <reason>`, `argue <handle> for <what you say>`; `supersede <handle> <words>` says your own thread again, better), `post <aim|request|propose|report|ask|declare> <words>` opens a thread about the room you stand in, `tellings` reads what was said around you, and a power's `thread=<handle>` names a quest's thread. Codomain: the messages the world sends you this turn (ending with what was told around you since your last), the results of any powers you used, and `packages`, the same as data.",
      domain: schemaFrom({ $id: "metroplat/world/command", title: "WorldCommand", type: "object", required: ["line"], properties: { line: { type: "string", minLength: 1 }, frame: { type: "boolean", description: "Also return the character's perception frame, for a client that draws the world." } }, additionalProperties: false }),
      codomain: turnContract,
      writes: ["world"],
      run: (input, _args, context) => instance().command(subjectOf(context, "anonymous"), input.line, callerOf(context), { frame: input.frame === true }),
    }),
    operation({
      verb: "world-atlas",
      summary: "Read the whole world as data: every room, its enclosing room, jurisdiction, and the offices, packages, skills and books standing in it.",
      description: "Domain: {}. Codomain: the atlas a graphical client draws the city from: the room tree packed (each room naming its enclosing room by index, its id and section path as tails of that room's; name, jurisdiction, nonzero thing counts, seated actors), the jurisdictions' tints and the city's dimensions. Every room's extent is qwzspace's terraced treemap of the tree in the atlas's order, so a client lays the city out as the world did. A turn's place is one room of it, as a character finds it.",
      domain: schemaFrom({ $id: "metroplat/world/atlas-request", title: "WorldAtlasRequest", type: "object", additionalProperties: false }),
      codomain: schemaFrom(atlasSchema),
      run: () => instance().atlas(),
    }),
    operation({
      verb: "world-pulse",
      summary: "Read the house at work in the world: every routine and account acting now, the room each acts in, each room's heat, and the acts since a prior reading.",
      description: "Domain: { since? }. The pulse is the day's RPC journal folded as people in the city: a routine (a clock schedule) or an account stands in the room of its latest act (its micro-enterprise's section, else the room its character stands in, else its office's), and rests between acts (a routine in the plaza, an account in its office). A room's heat is its acts, each halving every halfLife milliseconds since it was struck; read it at any instant as v * 2^-((now - at) / halfLife). Codomain: the walkers, warm rooms, and the acts after `since` (a prior reading's seq).",
      domain: schemaFrom({ $id: "metroplat/world/pulse-request", title: "WorldPulseRequest", type: "object", properties: { since: { type: "integer", minimum: 0, description: "A prior reading's seq: only later acts are returned." } }, additionalProperties: false }),
      codomain: schemaFrom(pulseSchema),
      run: (input) => instance().pulse(input?.since ?? 0),
    }),
    operation({
      verb: "world-tellings",
      summary: "Read what the house's work arena told in the world: every move on the work board as a line of the city, in the room its work is about, since a prior reading.",
      description: "Domain: { since?, room?, thread?, limit? }. Each move of the work arena (an opening, a promise, a delivery, a release, an answer) is told in the room of the deepest section its thread is about, else in its player's hall, else in the plaza; a room hears what is told in it and in every room it encloses, and the plaza hears the city. Read with `room` (a room id or a section path) for one room's hearing, `thread` (an id or an 8-character handle) for one thread's, and `since` (a prior reading's seq) for only what is new. Codomain: the tellings, each as prose and as fields (move, thread, handle, player, room, what it says) with the move's record by content address.",
      domain: schemaFrom({ $id: "metroplat/world/tellings-request", title: "WorldTellingsRequest", type: "object", properties: {
        since: { type: "integer", minimum: 0, description: "A prior reading's seq: only later tellings are returned." },
        room: { type: "string", minLength: 1, description: "A room id or a section path: only what that room hears." },
        thread: { type: "string", minLength: 1, description: "A thread's id or handle: only its tellings." },
        limit: { type: "integer", minimum: 1, maximum: 400, description: "At most this many, the latest." },
      }, additionalProperties: false }),
      codomain: schemaFrom(tellingsSchema),
      run: (input) => instance().tellings(input ?? {}),
    }),
    operation({
      verb: "world-journal",
      summary: "Read your journal in the world as data: the threads on the work board awaiting your character's move, nearest first, and how many more await the houses you serve.",
      description: "Domain: {}. Your journal is your character's agenda on the work board: every open thread awaiting a move of your account, your character or an office it holds, nearest horizon first and by the arena's attention within one, with the moves owed and as whom; the threads awaiting the micro-enterprises seating your offices (the houses you serve) are counted. It is what `journal` tells and a turn's Work.Journal package carries, read without a turn, for a client that tracks it. Codomain: its first page, each player in it named as the city names it.",
      domain: schemaFrom({ $id: "metroplat/world/journal-request", title: "WorldJournalRequest", type: "object", additionalProperties: false }),
      codomain: schemaFrom(journalSchema),
      run: (_input, _args, context) => instance().journal(subjectOf(context, "anonymous")),
    }),
  ]);
}
