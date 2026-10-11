import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {lstatSync,openSync,readSync,closeSync,existsSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
function sourceIdentity(file){
 const held=lstatSync(file);if(!held.isFile()||held.isSymbolicLink()||held.size>16*1024*1024)throw new Error('Discord historical source must be bounded regular custody');
 for(const suffix of ['-wal','-journal'])if(existsSync(file+suffix)){const sidecar=lstatSync(file+suffix);if(!sidecar.isFile()||sidecar.isSymbolicLink()||sidecar.size!==0)throw new Error('Discord historical source has unresolved transaction custody');}
 const hash=createHash('sha256'),fd=openSync(file,'r'),buffer=Buffer.alloc(65536);let total=0;
 try{for(;;){const bytes=readSync(fd,buffer,0,buffer.length,null);if(!bytes)break;total+=bytes;if(total>16*1024*1024)throw new Error('Discord historical source bound exhausted');hash.update(buffer.subarray(0,bytes));}return hash.digest('hex');}finally{closeSync(fd);}
}
export function importSqlDiscordAdmission(file, store, {expectedSha256}={}) {
    if(!/^[a-f0-9]{64}$/u.test(expectedSha256??'')||sourceIdentity(file)!==expectedSha256)throw new Error('Discord historical source identity is required and must match');
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
    const scratch=mkdtempSync(join(tmpdir(),'discord-historical-receiving-')),snapshot=join(scratch,'source.sqlite');let db;
    try {
        copyFileSync(file,snapshot);if(sourceIdentity(snapshot)!==expectedSha256)throw new Error('Discord historical snapshot changed');
        db = new DatabaseSync(snapshot, {readOnly:true});
        const present = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
        const admitted = {};let records=0,decodedBytes=0;
        db.exec('PRAGMA query_only=on');db.exec('BEGIN');
        for (const { table, key, into } of TABLES) {
            admitted[table] = 0;
            if (!present.has(table))
                continue;
            for (const row of db.prepare(`SELECT * FROM "${table}" ORDER BY "${key}"`).iterate()) {
                const value = { ...row };decodedBytes+=Buffer.byteLength(JSON.stringify(value));if(++records>20000||decodedBytes>16*1024*1024)throw new Error('Discord historical representation bound exhausted');
                const { before } = store.atomically(() => store[into].update(value[key], (held) => (held === null ? value : undefined)));
                if (before === null)
                    admitted[table] += 1;
            }
        }
        db.exec('COMMIT');if(sourceIdentity(file)!==expectedSha256)throw new Error('Discord original source changed during receiving');return admitted;
    }
    finally {
        db?.close();rmSync(scratch,{recursive:true,force:true});
    }
}
