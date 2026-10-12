#!/usr/bin/env node
// communicate-serve — this corpus's communicating actions over HTTP.
import { serveCommunicate } from "@red-cup-engineering/computer-language-systems-engineering-services-section/communicate";

import { actions } from "../actions.mjs";

if (import.meta.main) serveCommunicate(actions, "@emsenn/communicating-in-relation-conlang", 16869);
