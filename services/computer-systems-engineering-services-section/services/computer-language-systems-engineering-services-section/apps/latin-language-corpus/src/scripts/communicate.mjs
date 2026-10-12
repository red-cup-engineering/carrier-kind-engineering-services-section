#!/usr/bin/env node
// communicate — this corpus's communicating actions at the command line.
import { runCommunicate } from "@red-cup-engineering/computer-language-systems-engineering-services-section/communicate";

import { actions } from "../actions.mjs";

if (import.meta.main) await runCommunicate(actions, "@emsenn/communicating-in-latin");
