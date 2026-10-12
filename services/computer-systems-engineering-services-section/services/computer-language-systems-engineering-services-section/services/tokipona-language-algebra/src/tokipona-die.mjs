#!/usr/bin/env node
// tokipona-die.mjs — TokiPona text tagging, served as the language-systems tagging die.
import { serveTaggingDie, taggingDie } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tagging-die";

import { tagText } from "./tag.mjs";

export const die = taggingDie({ language: "tokipona", name: "TokiPona", tagText });
export const { solicit, invoke } = die;

if (import.meta.main) serveTaggingDie(die);
