import {
  parseJsonlLines,
  serializeEavt,
  toEavt,
  type EAVT,
  type JsonValue,
} from "@emsenn/relating/writing";

import { boundaryTextParam, type BoundaryParams } from "./records.mts";

export type OperationsManifoldDocumentScriptName = "admit-goal-document" | "admit-work-document" | "admit-context-document" | "record-hook-document";

export type OperationsManifoldDocumentScriptAction =
  | "scripts.admit-goal-document"
  | "scripts.admit-work-document"
  | "scripts.admit-context-document"
  | "scripts.record-hook-document";

export type BoundaryDocument = string;
export type DocumentMorphism = (document: BoundaryDocument) => BoundaryDocument;

export type OperationsManifoldDocumentScriptResult = Readonly<{
  kind: "operations-manifold.document-script";
  script: OperationsManifoldDocumentScriptName;
  action: OperationsManifoldDocumentScriptAction;
  inputBytes: number;
  outputBytes: number;
  document: BoundaryDocument;
}>;

export const operationsManifoldDocumentScriptNames: readonly OperationsManifoldDocumentScriptName[] = Object.freeze([
  "admit-goal-document",
  "admit-work-document",
  "admit-context-document",
  "record-hook-document",
]);

const actionByName: Readonly<Record<OperationsManifoldDocumentScriptName, OperationsManifoldDocumentScriptAction>> = Object.freeze({
  "admit-goal-document": "scripts.admit-goal-document",
  "admit-work-document": "scripts.admit-work-document",
  "admit-context-document": "scripts.admit-context-document",
  "record-hook-document": "scripts.record-hook-document",
});

const documentMorphisms: Readonly<Record<OperationsManifoldDocumentScriptAction, DocumentMorphism>> = Object.freeze({
  "scripts.admit-goal-document": (document) => transformDocument(document, "scripts.admit-goal-document", goalFacts),
  "scripts.admit-work-document": (document) => transformDocument(document, "scripts.admit-work-document", workFacts),
  "scripts.admit-context-document": (document) => transformDocument(document, "scripts.admit-context-document", contextFacts),
  "scripts.record-hook-document": (document) => transformDocument(document, "scripts.record-hook-document", hookFacts),
});

export function operationsManifoldDocumentScriptAction(name: OperationsManifoldDocumentScriptName): OperationsManifoldDocumentScriptAction {
  return actionByName[name];
}

export function morphOperationsManifoldDocumentScript(
  name: OperationsManifoldDocumentScriptName,
  document: BoundaryDocument,
): BoundaryDocument {
  return documentMorphisms[actionByName[name]](document);
}

export function operationsManifoldDocumentScriptBoundaryDocument(params: BoundaryParams): BoundaryDocument {
  return boundaryTextParam(params, "document", "__stdin") ?? "";
}

export function runOperationsManifoldDocumentScript(
  name: OperationsManifoldDocumentScriptName,
  document: BoundaryDocument,
): OperationsManifoldDocumentScriptResult {
  const output = morphOperationsManifoldDocumentScript(name, document);
  return Object.freeze({
    kind: "operations-manifold.document-script" as const,
    script: name,
    action: actionByName[name],
    inputBytes: Buffer.byteLength(document, "utf8"),
    outputBytes: Buffer.byteLength(output, "utf8"),
    document: output,
  });
}

function transformDocument(
  document: BoundaryDocument,
  action: OperationsManifoldDocumentScriptAction,
  transform: (document: FactDocument) => readonly EAVT[],
): BoundaryDocument {
  const facts = factDocument(readEavtDocument(document));
  return writeEavtDocument([...facts.eavts, ...transform(facts)]);
}

function readEavtDocument(text: BoundaryDocument): readonly EAVT[] {
  const trimmed = text.trim();
  if (trimmed === "") return Object.freeze([]);
  return Object.freeze(parseJsonlLines(trimmed).map((value) => toEavt(value as EAVT)));
}

function writeEavtDocument(eavts: readonly EAVT[]): BoundaryDocument {
  const unique = new Map<string, EAVT>();
  for (const eavt of eavts) unique.set(JSON.stringify(eavt), eavt);
  return serializeEavt([...unique.values()]);
}

type SubjectFacts = Readonly<{
  subject: JsonValue;
  facts: ReadonlyMap<string, readonly JsonValue[]>;
}>;

type FactDocument = Readonly<{
  eavts: readonly EAVT[];
  subjects: readonly SubjectFacts[];
}>;

function factDocument(eavts: readonly EAVT[]): FactDocument {
  const bySubject = new Map<string, { subject: JsonValue; facts: Map<string, JsonValue[]> }>();
  for (const [subject, attribute, value] of eavts) {
    if (typeof attribute !== "string") continue;
    const key = JSON.stringify(subject);
    const entry = bySubject.get(key) ?? { subject, facts: new Map<string, JsonValue[]>() };
    const values = entry.facts.get(attribute) ?? [];
    values.push(value);
    entry.facts.set(attribute, values);
    bySubject.set(key, entry);
  }
  return Object.freeze({
    eavts,
    subjects: Object.freeze([...bySubject.values()].map((entry) => Object.freeze({
      subject: entry.subject,
      facts: entry.facts,
    }))),
  });
}

function subjectsFor(document: FactDocument, action: OperationsManifoldDocumentScriptAction): readonly SubjectFacts[] {
  return document.subjects.filter((entry) => strings(entry, "operations-manifold.script.action").includes(action));
}

function strings(entry: SubjectFacts, predicate: string): readonly string[] {
  return (entry.facts.get(predicate) ?? []).filter((value): value is string => typeof value === "string" && value.trim() !== "");
}

function firstString(entry: SubjectFacts, predicate: string): string | undefined {
  return strings(entry, predicate)[0];
}

function firstNumber(entry: SubjectFacts, predicate: string): number | undefined {
  return (entry.facts.get(predicate) ?? []).find((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function timeFor(action: OperationsManifoldDocumentScriptAction): JsonValue {
  return ["operations-manifold", "script", action];
}

function fact(subject: JsonValue, predicate: string, value: JsonValue, action: OperationsManifoldDocumentScriptAction): EAVT {
  return [subject, predicate, value, timeFor(action)];
}

function obstruction(subject: JsonValue, action: OperationsManifoldDocumentScriptAction, reason: string): readonly EAVT[] {
  return [
    fact(subject, "operations-manifold.script.obstruction", reason, action),
    fact(subject, "operations-manifold.result.admitted", false, action),
  ];
}

function goalFacts(document: FactDocument): readonly EAVT[] {
  return subjectsFor(document, "scripts.admit-goal-document").flatMap((entry) => {
    const text = firstString(entry, "operations-manifold.goal.text");
    if (text === undefined) return obstruction(entry.subject, "scripts.admit-goal-document", "missing-goal-text");
    const title = firstString(entry, "operations-manifold.goal.title") ?? titleFor(text);
    const priority = firstNumber(entry, "operations-manifold.goal.priority") ?? 50;
    return [
      fact(entry.subject, "operations-manifold.result.admitted", true, "scripts.admit-goal-document"),
      fact(entry.subject, "operations-manifold.goal.title", title, "scripts.admit-goal-document"),
      fact(entry.subject, "operations-manifold.goal.status", "proposed", "scripts.admit-goal-document"),
      fact(entry.subject, "operations-manifold.goal.priority", clamp(priority, 0, 100), "scripts.admit-goal-document"),
      fact(entry.subject, "operations-manifold.work.candidate", true, "scripts.admit-goal-document"),
    ];
  });
}

function workFacts(document: FactDocument): readonly EAVT[] {
  return subjectsFor(document, "scripts.admit-work-document").flatMap((entry) => {
    const title = firstString(entry, "operations-manifold.work.title");
    const intent = firstString(entry, "operations-manifold.work.intent");
    const success = firstString(entry, "operations-manifold.work.success");
    if (title === undefined) return obstruction(entry.subject, "scripts.admit-work-document", "missing-read-work-title");
    if (intent === undefined) return obstruction(entry.subject, "scripts.admit-work-document", "missing-read-work-intent");
    if (success === undefined) return obstruction(entry.subject, "scripts.admit-work-document", "missing-read-work-success");
    return [
      fact(entry.subject, "operations-manifold.result.admitted", true, "scripts.admit-work-document"),
      fact(entry.subject, "operations-manifold.work.status", "active", "scripts.admit-work-document"),
      fact(entry.subject, "operations-manifold.work.gate", firstString(entry, "operations-manifold.work.gate") ?? "record", "scripts.admit-work-document"),
      fact(entry.subject, "operations-manifold.work.owner", firstString(entry, "operations-manifold.work.owner") ?? "operations-manifold", "scripts.admit-work-document"),
      fact(entry.subject, "operations-manifold.work.kind", firstString(entry, "operations-manifold.work.kind") ?? "task", "scripts.admit-work-document"),
    ];
  });
}

function contextFacts(document: FactDocument): readonly EAVT[] {
  return subjectsFor(document, "scripts.admit-context-document").flatMap((entry) => {
    const intent = firstString(entry, "operations-manifold.context.intent");
    if (intent === undefined) return obstruction(entry.subject, "scripts.admit-context-document", "missing-context-intent");
    return [
      fact(entry.subject, "operations-manifold.result.admitted", true, "scripts.admit-context-document"),
      fact(entry.subject, "operations-manifold.context.budget", firstNumber(entry, "operations-manifold.context.budget") ?? 12_000, "scripts.admit-context-document"),
      fact(entry.subject, "operations-manifold.context.requires-suit", true, "scripts.admit-context-document"),
    ];
  });
}

function hookFacts(document: FactDocument): readonly EAVT[] {
  return subjectsFor(document, "scripts.record-hook-document").flatMap((entry) => {
    const event = firstString(entry, "operations-manifold.hook.event") ?? firstString(entry, "codex.hook_event_name");
    if (event === undefined) return obstruction(entry.subject, "scripts.record-hook-document", "missing-record-hook-event");
    return [
      fact(entry.subject, "operations-manifold.result.recorded", true, "scripts.record-hook-document"),
      fact(entry.subject, "operations-manifold.operation.event", "record-hook-event", "scripts.record-hook-document"),
      fact(entry.subject, "operations-manifold.operation.predicate", `operations-manifold.hook.${slug(event)}`, "scripts.record-hook-document"),
      fact(entry.subject, "operations-manifold.hook.recorded", true, "scripts.record-hook-document"),
    ];
  });
}

function titleFor(text: string): string {
  const words = text.trim().split(/\s+/u).slice(0, 12).join(" ");
  return words.length <= 96 ? words : words.slice(0, 96);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "event";
}
