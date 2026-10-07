import { existsSync } from "node:fs";
import path from "node:path";

/** Find existing fixture data without looping forever at the filesystem root. */
export function fixtureRepository(start, relativeFixturePath) {
  const origin = path.resolve(start);
  let repository = origin;
  for (;;) {
    if (existsSync(path.join(repository, relativeFixturePath))) return repository;
    const parent = path.dirname(repository);
    if (parent === repository) {
      const error = new Error(`Required fixture ${relativeFixturePath} not found from ${origin}; reached filesystem root ${repository}`);
      error.code = "ERR_REQUIRED_FIXTURE_MISSING";
      throw error;
    }
    repository = parent;
  }
}
