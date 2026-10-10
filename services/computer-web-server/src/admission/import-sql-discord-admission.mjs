// The rows a D1 (SQLite) Discord admission database held, read once, read-only, and admitted into
// the journal store that now keeps them (discord-store.mjs). SQL survives here only as that
// admission path for old bytes: `wrangler d1 export` or a local SQLite file of the tables
// admission's D1 migrations created (discord_oauth_sessions, discord_command_login_challenges,
// discord_interaction_sessions). A table the file lacks holds nothing to admit; a row the store
// already holds is left as the store has it. discord_command_login_rate_limits is not read: its
// windows last a minute and are not facts worth keeping.
const TABLES = Object.freeze([
    Object.freeze({ table: 'discord_oauth_sessions', key: 'session_hash', into: 'oauthSessions' }),
    Object.freeze({ table: 'discord_command_login_challenges', key: 'challenge_hash', into: 'commandChallenges' }),
    Object.freeze({ table: 'discord_interaction_sessions', key: 'session_hash', into: 'interactionSessions' }),
]);
/** Admit every row of the SQLite file at `file` into `store`; returns how many were admitted per table. */
export function importSqlDiscordAdmission(file, store) {
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
    const db = new DatabaseSync(file, { readOnly: true });
    try {
        const present = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
        const admitted = {};
        for (const { table, key, into } of TABLES) {
            admitted[table] = 0;
            if (!present.has(table))
                continue;
            for (const row of db.prepare(`SELECT * FROM "${table}" ORDER BY "${key}"`).all()) {
                const value = { ...row };
                const { before } = store.atomically(() => store[into].update(value[key], (held) => (held === null ? value : undefined)));
                if (before === null)
                    admitted[table] += 1;
            }
        }
        return admitted;
    }
    finally {
        db.close();
    }
}
