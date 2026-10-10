// Discord admission's journal store, and the read-once import of what a D1 (SQLite) database held.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createSemanticRecordJournal } from '@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record';
import { DISCORD_ADMISSION_OBJECT_KIND, DISCORD_ADMISSION_TABLES, createDiscordAdmissionStore } from "../src/admission/discord-store.mjs";
import { importSqlDiscordAdmission } from "../src/admission/import-sql-discord-admission.mjs";
import { ADMISSION_MIGRATIONS } from "./fixtures/legacy-d1-admission-schema.mjs";

function freshRoot(t, name) {
  const root = mkdtempSync(join(tmpdir(), name));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('a row is its highest revision, a removal is told denied, and every revision stays in the journal', (t) => {
  const root = freshRoot(t, 'discord-store-');
  const store = createDiscordAdmissionStore({ root });
  assert.equal(store.oauthSessions.read('s1'), null);
  store.oauthSessions.write('s1', { session_hash: 's1', retry_after: 0 });
  store.oauthSessions.write('s1', { session_hash: 's1', retry_after: 9 });
  assert.deepEqual(store.oauthSessions.read('s1'), { session_hash: 's1', retry_after: 9 });
  store.oauthSessions.write('s1', null);
  assert.equal(store.oauthSessions.read('s1'), null);
  assert.deepEqual(store.oauthSessions.rows(), []);

  const history = createSemanticRecordJournal({ root, objectKind: DISCORD_ADMISSION_OBJECT_KIND }).query({ category: DISCORD_ADMISSION_TABLES.oauthSessions });
  assert.deepEqual(history.map((entry) => entry.record.revision), [1, 2, 3]);
  assert.deepEqual(history.map((entry) => entry.told), [{ for: true, against: false }, { for: true, against: false }, { for: false, against: true }]);
  // A reopened store reads the same rows from the journal.
  assert.equal(createDiscordAdmissionStore({ root }).oauthSessions.read('s1'), null);
});

test('an update writes only what its change returns, as one step', (t) => {
  const store = createDiscordAdmissionStore({ root: freshRoot(t, 'discord-store-update-') });
  const once = (row) => (row === null || row.approved_at !== null ? undefined : { ...row, approved_at: 5 });
  assert.deepEqual(store.atomically(() => store.commandChallenges.update('c', once)), { before: null, after: null });
  store.commandChallenges.write('c', { challenge_hash: 'c', approved_at: null });
  assert.deepEqual(store.atomically(() => store.commandChallenges.update('c', once)).after, { challenge_hash: 'c', approved_at: 5 });
  const second = store.atomically(() => store.commandChallenges.update('c', once));
  assert.equal(second.before, second.after, 'a challenge is approved once');
  store.rateLimits.write('k', { rate_key: 'k', attempts: 1, reset_at: 10 });
  store.interactionSessions.write('i', { session_hash: 'i' });
  assert.deepEqual(store.rateLimits.rows(), [{ rate_key: 'k', attempts: 1, reset_at: 10 }]);
  assert.deepEqual(store.interactionSessions.rows(), [{ session_hash: 'i' }]);
});

test('a D1 admission database is admitted into the journal once', (t) => {
  const root = freshRoot(t, 'discord-store-import-');
  const file = join(root, 'admission.sqlite');
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const legacy = new DatabaseSync(file);
  for (const migration of ADMISSION_MIGRATIONS) legacy.exec(migration.sql);
  legacy.prepare(`INSERT INTO discord_oauth_sessions (session_hash, subject_hash, discord_user_id, display_name, authorization_ciphertext, authorization_version, token_expires_at, session_expires_at, retry_after, created_at, updated_at)
    VALUES ('s1', 'h1', '345678901234567890', 'Reader', 'sealed', 2, 100, 200, 0, 1, 2)`).run();
  legacy.prepare(`INSERT INTO discord_command_login_challenges (challenge_hash, verifier_hash, expires_at, approved_at, consumed_at, subject_hash, discord_user_ciphertext, created_at)
    VALUES ('c1', 'v1', 300, NULL, NULL, NULL, NULL, 3)`).run();
  legacy.prepare(`INSERT INTO discord_command_login_rate_limits (rate_key, attempts, reset_at) VALUES ('k1', 4, 400)`).run();
  legacy.close();

  const store = createDiscordAdmissionStore({ root: join(root, 'journal') });
  assert.deepEqual(importSqlDiscordAdmission(file, store), {
    discord_oauth_sessions: 1, discord_command_login_challenges: 1, discord_interaction_sessions: 0, discord_command_login_rate_limits: 1,
  });
  assert.deepEqual(store.oauthSessions.read('s1'), {
    session_hash: 's1', subject_hash: 'h1', discord_user_id: '345678901234567890', display_name: 'Reader', authorization_ciphertext: 'sealed',
    authorization_version: 2, token_expires_at: 100, session_expires_at: 200, retry_after: 0, created_at: 1, updated_at: 2,
  });
  assert.equal(store.commandChallenges.read('c1').approved_at, null);
  assert.equal(store.rateLimits.read('k1').attempts, 4);

  // The journal is now the store: a second reading admits nothing and changes nothing.
  store.rateLimits.write('k1', { rate_key: 'k1', attempts: 5, reset_at: 400 });
  assert.deepEqual(Object.values(importSqlDiscordAdmission(file, store)), [0, 0, 0, 0]);
  assert.equal(store.rateLimits.read('k1').attempts, 5);
});
