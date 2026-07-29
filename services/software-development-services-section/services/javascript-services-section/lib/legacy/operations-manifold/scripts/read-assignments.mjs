#!/usr/bin/env node
/**
 * read-assignments — project the office/duty/assignment spine from read-work:
 * assignment-records (workitem → incumbent session/agent, skill, office, FOUR
 * charge) and receivers (sessions with the skills they advertise, the offices
 * they act under, and their load).
 */
import { readAssignments } from "../src/assignment.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot) => readAssignments(repoRoot);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-assignments", "operations-manifold assignments", morphism);
}
