#!/usr/bin/env node
// latin-die.mjs — Latin text tagging, served as the language-systems tagging die.
import { serveTaggingDie, taggingDie } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tagging-die";

import { tagText } from "./tag.mjs";

export const die = taggingDie({ language: "latin", name: "Latin", tagText });
export const { solicit, invoke } = die;

if (import.meta.main) serveTaggingDie(die);
