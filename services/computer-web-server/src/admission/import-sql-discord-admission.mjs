// The rows a D1 (SQLite) Discord admission database held, read once, read-only, and admitted into
// the journal store that now keeps them (discord-store.mjs). The node runtime holds no SQL: the
// file is received by read-legacy-sqlite.py (read-only, immutable, bounded; see
// legacy-sqlite-reader.mjs), which streams the rows of the tables admission's D1 migrations
// created (discord_oauth_sessions, discord_command_login_challenges, discord_interaction_sessions)
// from `wrangler d1 export` or a local file. A table the file lacks holds nothing to admit; a row
// the store already holds is left as the store has it. discord_command_login_rate_limits is not
// read: its windows last a minute and are not facts worth keeping.
import { readLegacySqlite } from '@red-cup-engineering/computer-system-engine/legacy-sqlite-reader';
const TABLES = Object.freeze([
    Object.freeze({ table: 'discord_oauth_sessions', key: 'session_hash', into: 'oauthSessions' }),
    Object.freeze({ table: 'discord_command_login_challenges', key: 'challenge_hash', into: 'commandChallenges' }),
    Object.freeze({ table: 'discord_interaction_sessions', key: 'session_hash', into: 'interactionSessions' }),
]);
/** Admit every row of the legacy SQLite file at `file` into `store`; returns how many were admitted per table. */
export function importSqlDiscordAdmission(file, store) {
    return readLegacySqlite(file, TABLES.map(({ table, key }) => ({ table, order: key })), (legacy) => {
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
        return admitted;
    });
}
