import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeLegacySqlite} from './write-legacy-sqlite.mjs';
import {readLegacySqlite} from '../legacy-sqlite-reader.mjs';
// This explicit historical suite executes SQLite and is never a native test enrollment.
for(const layout of ['CREATE TABLE records (other TEXT)','CREATE TABLE other (key TEXT)'])test('malformed empty legacy schema refuses: '+layout,t=>{
 const root=mkdtempSync(join(tmpdir(),'historical-reader-schema-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const file=join(root,'source.sqlite');writeLegacySqlite(file,[layout]);
 let called=false;assert.throws(()=>readLegacySqlite(file,[{table:'records',required:true,requiredColumns:['key','value']}],()=>{called=true;}),/required|lacks/);assert.equal(called,false);
});
test('correct empty schema is explicit valid historical evidence',t=>{
 const root=mkdtempSync(join(tmpdir(),'historical-reader-schema-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const file=join(root,'source.sqlite');writeLegacySqlite(file,['CREATE TABLE records (key TEXT, value TEXT)']);
 assert.equal(readLegacySqlite(file,[{table:'records',required:true,requiredColumns:['key','value']}],legacy=>legacy.has('records')&&[...legacy.rows('records')].length===0),true);
});
