#!/usr/bin/env node
import { normalizeSemanticLinefeeds } from "../src/normalize-semantic-linefeeds.mjs";

process.stdin.setEncoding("utf8");
let text = "";
for await (const chunk of process.stdin) text += chunk;
process.stdout.write(normalizeSemanticLinefeeds(text));
