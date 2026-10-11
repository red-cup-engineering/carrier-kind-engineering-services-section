import { withHistoricalSnapshot } from "./custody.mjs";
// The rows a D1 (SQLite) Discord admission database held, read once, read-only, and admitted into
// the journal store that now keeps them (discord-store.mjs). The node runtime holds no SQL: the
// file is received by read-legacy-sqlite.py (read-only, immutable, bounded; see
// legacy-sqlite-reader.mjs), which streams the rows of the tables admission's D1 migrations
// created (discord_oauth_sessions, discord_command_login_challenges, discord_interaction_sessions)
// from `wrangler d1 export` or a local file. A table the file lacks holds nothing to admit; a row
// the store already holds is left as the store has it. discord_command_login_rate_limits is not
// read: its windows last a minute and are not facts worth keeping.
import { readLegacySqlite } from '@red-cup-engineering/historical-sql-reader-service';
const TABLES = Object.freeze([
    Object.freeze({ table: 'discord_oauth_sessions', requiredColumns: ["session_hash", "subject_hash", "discord_user_id", "display_name", "authorization_ciphertext", "authorization_version", "token_expires_at", "session_expires_at", "retry_after", "created_at", "updated_at"], key: 'session_hash', into: 'oauthSessions' }),
    Object.freeze({ table: 'discord_command_login_challenges', requiredColumns: ["challenge_hash", "verifier_hash", "expires_at", "approved_at", "consumed_at", "subject_hash", "discord_user_ciphertext", "created_at"], key: 'challenge_hash', into: 'commandChallenges' }),
    Object.freeze({ table: 'discord_interaction_sessions', requiredColumns: ["session_hash", "subject_hash", "discord_user_ciphertext", "session_expires_at", "created_at"], key: 'session_hash', into: 'interactionSessions' }),
]);
/** Admit every row of the legacy SQLite file at `file` into `store`; returns how many were admitted per table. */
export function importSqlDiscordAdmission(file, store, {expectedSha256, python}={}) {
 return withHistoricalSnapshot(file, store.root, expectedSha256, (snapshot, verify) => {
    return readLegacySqlite(snapshot, TABLES.map(({ table, key, requiredColumns }) => ({ table, order: key, requiredColumns })), (legacy) => {
        if(!TABLES.some(({table})=>legacy.has(table)))throw new Error('Discord historical source has no recognized admission tables');
        verify();
        const admitted = {};
        for (const { table, key, into } of TABLES) {
            admitted[table] = 0;
            if (!legacy.has(table))
                continue;
            for (const row of legacy.rows(table)) {
                const { before } = store.atomically(() => store[into].update(row[key], (held) => (held === null ? row : undefined)));
                if (before === null)
                    admitted[table] += 1;
            }
        }
        verify();
        return admitted;
    }, {python});
 });
}
