import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readEnvFile,
  custodyInvocation,
  resolveAgentBinary,
} from "../src/transfer-git-lfs-objects-to-r2.mjs";

const CONFIG = JSON.parse(
  readFileSync(
    join(dirname(dirname(fileURLToPath(import.meta.url))), "content/configs/git-lfs-object-custody.json"),
    "utf8",
  ),
);

const SECRETS = {
  CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_R2_BARE_CEDAR_FOG_GIT_LFS_ACCESS_KEY_ID: "b".repeat(32),
  CLOUDFLARE_R2_BARE_CEDAR_FOG_GIT_LFS_ACCESS_KEY_SECRET: "c".repeat(64),
};

test("the binding names this laptop's bucket and stores objects verifiably", () => {
  assert.equal(CONFIG.bucket, "bare-cedar-fog-git-lfs");
  assert.equal(CONFIG.compression, "none");
});

test("credentials travel in the environment, never in argv", () => {
  const { args, env } = custodyInvocation(CONFIG, SECRETS);
  assert.equal(env.AWS_ACCESS_KEY_ID, SECRETS.CLOUDFLARE_R2_BARE_CEDAR_FOG_GIT_LFS_ACCESS_KEY_ID);
  assert.equal(env.AWS_SECRET_ACCESS_KEY, SECRETS.CLOUDFLARE_R2_BARE_CEDAR_FOG_GIT_LFS_ACCESS_KEY_SECRET);
  for (const argument of args) {
    assert.doesNotMatch(argument, /b{32}|c{64}/, `credential leaked into argv: ${argument}`);
  }
});

test("the account id resolves into the R2 endpoint", () => {
  const { args, env } = custodyInvocation(CONFIG, SECRETS);
  const expected = `https://${"a".repeat(32)}.r2.cloudflarestorage.com`;
  assert.equal(env.AWS_ENDPOINT_URL_S3, expected);
  assert.ok(args.includes(`-endpoint=${expected}`));
  assert.ok(args.includes("-use_path_style"));
});

test("a missing credential refuses rather than uploading nowhere", () => {
  const { CLOUDFLARE_R2_ACCOUNT_ID: _omitted, ...partial } = SECRETS;
  assert.throws(() => custodyInvocation(CONFIG, partial), /CLOUDFLARE_R2_ACCOUNT_ID/);
});

test("the agent binary is found outside PATH, as git-lfs invokes it", () => {
  const directory = mkdtempSync(join(tmpdir(), "lfs-agent-"));
  writeFileSync(join(directory, "lfs-s3"), "");
  assert.equal(
    resolveAgentBinary("lfs-s3", { GOBIN: directory, PATH: "" }),
    join(directory, "lfs-s3"),
  );
});

test("quoted values in .env are read unquoted", () => {
  const directory = mkdtempSync(join(tmpdir(), "lfs-env-"));
  const path = join(directory, ".env");
  writeFileSync(path, '# comment\nPLAIN=one\nQUOTED="two"\nAPOS=\'three\'\n');
  const found = readEnvFile(path);
  assert.deepEqual(
    { PLAIN: found.PLAIN, QUOTED: found.QUOTED, APOS: found.APOS },
    { PLAIN: "one", QUOTED: "two", APOS: "three" },
  );
});
