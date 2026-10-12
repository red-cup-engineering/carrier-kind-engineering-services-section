#!/usr/bin/env node
// mandarin-die.mjs — Mandarin text tagging, served as the language-systems tagging die.
import { serveTaggingDie, taggingDie } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tagging-die";

import { tagText } from "./tag.mjs";

export const die = taggingDie({ language: "mandarin", name: "Mandarin", tagText });
export const { solicit, invoke } = die;

if (import.meta.main) serveTaggingDie(die);
