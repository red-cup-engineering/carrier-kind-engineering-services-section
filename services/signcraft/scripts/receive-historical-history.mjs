// Offline receiving of earlier SignCraft history into a new flatfile history store:
//   python3 scripts/read-historical-history.py <historical-file> <sha256> | node scripts/receive-historical-history.mjs <new-history-path>
// Never run at startup, and never opens a database: it reads the JSON lines the reader emits.
import {createInterface} from 'node:readline';
import {existsSync} from 'node:fs';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
import {collectHistoricalLines,receiveHistoricalHistory} from '../src/historical-history.mjs';

const target=process.argv[2];
if(!target)throw new TypeError('usage: receive-historical-history.mjs <new-history-path>');
if(existsSync(target))throw new TypeError('Receiving writes a new history; the target already exists');
const lines=[];
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
 if(Buffer.byteLength(line)>5*1024*1024)throw new TypeError('Historical input line bound');
 lines.push(line);
}
const {sha256,tables}=collectHistoricalLines(lines);
const loaded=receiveHistoricalHistory({tables,store:createFileHistoryStore(target)});
console.log(JSON.stringify({kind:'received',sourceSha256:sha256,tables:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),clock:loaded?.control?.clock??null}));
