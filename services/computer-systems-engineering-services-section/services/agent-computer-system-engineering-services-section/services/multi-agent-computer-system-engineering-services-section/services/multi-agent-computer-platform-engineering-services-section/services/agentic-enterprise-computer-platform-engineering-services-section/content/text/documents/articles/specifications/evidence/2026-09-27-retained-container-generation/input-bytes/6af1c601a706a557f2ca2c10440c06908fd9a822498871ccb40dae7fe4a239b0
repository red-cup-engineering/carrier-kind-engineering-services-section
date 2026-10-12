#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/is-json-value.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** Test whether a JavaScript value is finite, acyclic JSON data. */
export function isJsonValue(value) {
  const ancestors = new Set();
  const frames = [{ item: value, entered: false }];
  let result = true;

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    if (!frame.entered) {
      const item = frame.item;
      if (item === null || typeof item === "boolean" || typeof item === "string") {
        result = true;
        frames.pop();
        continue;
      }
      if (typeof item === "number") {
        result = Number.isFinite(item);
        frames.pop();
        continue;
      }
      if (Array.isArray(item)) {
        if (ancestors.has(item)) {
          result = false;
          frames.pop();
          continue;
        }
        ancestors.add(item);
        frame.entered = true;
        frame.array = true;
        frame.index = 0;
        frame.length = item.length;
        continue;
      }
      if (
        typeof item !== "object" ||
        Object.getPrototypeOf(item) !== Object.prototype ||
        ancestors.has(item)
      ) {
        result = false;
        frames.pop();
        continue;
      }
      ancestors.add(item);
      frame.entered = true;
      frame.array = false;
      frame.children = Object.values(item);
      frame.index = 0;
      continue;
    }

    if (frame.awaitingChild) {
      if (!result) {
        ancestors.delete(frame.item);
        frames.pop();
        continue;
      }
      frame.awaitingChild = false;
      frame.index += 1;
    }
    const count = frame.array ? frame.length : frame.children.length;
    if (frame.index >= count) {
      ancestors.delete(frame.item);
      result = true;
      frames.pop();
      continue;
    }
    let child;
    if (frame.array) {
      const index = frame.index;
      if (!Object.hasOwn(frame.item, index)) {
        ancestors.delete(frame.item);
        result = false;
        frames.pop();
        continue;
      }
      child = frame.item[index];
    } else {
      child = frame.children[frame.index];
    }
    frame.awaitingChild = true;
    frames.push({ item: child, entered: false });
  }
  return result;
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isJsonValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
