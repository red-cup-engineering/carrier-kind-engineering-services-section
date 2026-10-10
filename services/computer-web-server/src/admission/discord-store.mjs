// What Discord admission remembers, kept as signed records in a semantic record journal (SEAVT)
// rather than SQL tables. Each table is a category of records keyed by its hash: OAuth sessions,
// command-login challenges, interaction sessions and command-login rate limits. A row's history is
// its records, each carrying the next `revision`; the row is the one with the highest revision,
// and a removal is a record told denied (for false, against true), so nothing is erased. A change
// that depends on the row it reads (a refresh that must not overwrite a concurrent one, a challenge
// approved or consumed once) runs under one directory lock per store, which serializes writers on
// this host the way a conditional UPDATE did.
import { join } from 'node:path';
import { createSemanticRecordJournal } from '@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record';
import { createFieldIndex } from '@red-cup-engineering/semiotic-eavt-services-section/field-index';
import { withDirectoryLock } from '@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/directory-lock';
export const DISCORD_ADMISSION_OBJECT_KIND = 'web-admission.discord';
export const DISCORD_ADMISSION_TABLES = Object.freeze({
    oauthSessions: 'oauth-session',
    commandChallenges: 'command-login-challenge',
    interactionSessions: 'interaction-session',
    rateLimits: 'command-login-rate-limit',
});
const HELD = Object.freeze({ for: true, against: false });
const REMOVED = Object.freeze({ for: false, against: true });
function createTable(journal, root, category) {
    const index = createFieldIndex({ root, objectKind: DISCORD_ADMISSION_OBJECT_KIND, category, fields: { key: 'key' } });
    const newest = (key) => {
        let found;
        for (const entry of index.get('key', key))
            if (found === undefined || entry.record.revision > found.record.revision)
                found = entry;
        return found;
    };
    const read = (key) => {
        const entry = newest(key);
        return entry === undefined || entry.record.value === null ? null : structuredClone(entry.record.value);
    };
    const write = (key, value) => {
        const revision = (newest(key)?.record.revision ?? 0) + 1;
        journal.record({ category, recordedAt: new Date().toISOString(), told: value === null ? REMOVED : HELD, record: { key, revision, value } });
    };
    return Object.freeze({
        /** The row kept under `key`, or null. */
        read,
        /** Replace the row under `key` with `value`; null removes it. */
        write,
        /** Read the row under `key` and write what `change(row)` returns, as one step: undefined
         * leaves the row as it was, null removes it. Returns the row read and the row now held. */
        update(key, change) {
            const before = read(key);
            const next = change(before === null ? null : structuredClone(before));
            if (next === undefined)
                return { before, after: before };
            write(key, next);
            return { before, after: next };
        },
        /** Every row now held, read whole from the journal (retention runs, not request paths). */
        rows() {
            const newestByKey = new Map();
            for (const entry of journal.query({ category })) {
                const held = newestByKey.get(entry.record.key);
                if (held === undefined || entry.record.revision > held.revision)
                    newestByKey.set(entry.record.key, entry.record);
            }
            return [...newestByKey.values()].filter((entry) => entry.value !== null).map((entry) => structuredClone(entry.value));
        },
    });
}
/** Discord admission's store over the semantic record journal under `root`. */
export function createDiscordAdmissionStore({ root } = {}) {
    if (typeof root !== 'string' || root.length === 0)
        throw new TypeError('Discord admission store requires a journal root');
    const journal = createSemanticRecordJournal({ root, objectKind: DISCORD_ADMISSION_OBJECT_KIND });
    const tables = Object.fromEntries(Object.entries(DISCORD_ADMISSION_TABLES).map(([name, category]) => [name, createTable(journal, journal.root, category)]));
    const lockDirectory = join(journal.root, '.discord-admission');
    return Object.freeze({
        root: journal.root,
        ...tables,
        /** Run `work` as one step against every other writer of this store on this host. */
        atomically: (work) => withDirectoryLock(lockDirectory, work),
    });
}
