import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');

test('the original SQL reader assay is explicit while all three native historical cases remain enrolled',()=>{
 const manifest=JSON.parse(read('package.json'));
 assert.equal(manifest.scripts.test,'node --test "test/**/*.test.mjs"');
 assert.equal(manifest.scripts['test:legacy-sql'],'node --test qualification/legacy-sql/*.test.mjs');
 assert.deepEqual(manifest.files,['src','scripts']);
 assert.equal(manifest.exports['./historical-history'],'./src/historical-history.mjs');
 const legacy=read('qualification/legacy-sql/history-admission-effects.test.mjs');
 assert.match(legacy,/withPython\('a real earlier relational file/u);
 assert.match(legacy,/spawnSync\('python3'/u);
 assert.match(read('scripts/read-historical-history.py'),/^import[^\n]*\bsqlite3\b/mu);
 assert.match(read('test/fixtures/build-historical-file.py'),/sqlite3/u);
 const native=read('test/history-admission-effects.test.mjs');
 assert.doesNotMatch(native,/withPython|python3|test\.skip/u);
 for(const title of ['received historical rows become flatfile history','rows that do not substantiate a recorded checkpoint','the reader\\\'s lines are checked'])assert(native.includes(title),title);
 for(const value of Object.values(manifest.exports))assert(!value.includes('qualification/'));
 const source=read('src/file-history-store.mjs');assert.doesNotMatch(source,/createRequire|DatabaseSync|renameSync|admitSqlFile/u);
});
