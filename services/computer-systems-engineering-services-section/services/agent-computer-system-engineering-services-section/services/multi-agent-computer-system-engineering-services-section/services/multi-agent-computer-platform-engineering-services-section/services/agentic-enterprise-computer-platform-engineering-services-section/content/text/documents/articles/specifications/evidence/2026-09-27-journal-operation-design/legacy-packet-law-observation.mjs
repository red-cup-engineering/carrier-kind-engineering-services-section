import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root='/home/emsenn/info';
const code=path.resolve(path.dirname(fs.readFileSync('/tmp/muse-segment-path','utf8').trim()),'../../../..');
const system=fs.readFileSync('/tmp/muse-system-path','utf8').trim();
const packetPath=path.join(code,'src/semiotic-eavt/journal/packet.mjs');
const identityPath=path.join(code,'src/semiotic-eavt/identity/index.mjs');
const textPath=path.join(code,'src/semiotic-eavt/identity/text-document.mjs');
const writerPath=path.join(system,'src/journal/filesystem/write-journal-store.mjs');
const indexPath=path.join(system,'src/journal/filesystem/index.mjs');
const {journalPacket,resolveJournalPacket}=await import(pathToFileURL(packetPath));
const {addressArtifact,addressTextDocument,verifyArtifact}=await import(pathToFileURL(identityPath));
const {packetArtifactPath,packetReferencePath}=await import(pathToFileURL(indexPath));
const digest=value=>createHash('sha256').update(value).digest('hex');
const writer=fs.readFileSync(writerPath,'utf8');
const fn=writer.slice(writer.indexOf('export function writePacketText('),writer.indexOf('function packetReference(')).replace('export function','function');
const retained=new Map();
const write=vm.runInNewContext(fn+'\nwritePacketText',{
 sha256Hex:digest,packetArtifactPath,packetReferencePath,Buffer,
 alreadyExists:e=>e.code==='EEXIST',
 writeFileAtomicNew(p,text){if(retained.has(p))throw Object.assign(new Error('exists'),{code:'EEXIST'});retained.set(p,text);}
});
const value={request:'actuation:fixture',result:'completed',notes:Array.from({length:900},(_,i)=>String(i)+':Pheží Ocháǧe '+ 'x'.repeat(360))};
const originalText=JSON.stringify(value,null,1)+'\r\n';
const old=write('/fixture/log/2026/09/27',originalText);
const exactFile=retained.get(old.path);
assert.equal(exactFile,originalText+'\n');
assert.equal(old.sha256,digest(originalText));
assert.equal(old.bytes,Buffer.byteLength(originalText));
assert.notEqual(digest(exactFile),old.sha256);

const rawDocument=addressTextDocument(exactFile);
const artifacts=new Map(rawDocument.artifacts.map(a=>[a.ref,a]));
for(const a of artifacts.values())assert.equal(verifyArtifact(a.ref,a.canonicalText).canonical.text,a.canonicalText);
const descriptor=verifyArtifact(rawDocument.ref,artifacts.get(rawDocument.ref).canonicalText).canonical.value;
const leaves=[];
function visit(ref){const a=artifacts.get(ref);assert(a);const v=verifyArtifact(ref,a.canonicalText).canonical.value;if(v.kind==='metroplat.identity.text-document-leaf'){assert.equal(v.index,leaves.length);assert.equal(v.utf8Bytes,Buffer.byteLength(v.text));leaves.push(v.text);}else{assert.equal(v.kind,'metroplat.identity.text-document-branch');assert(v.children.length<=128);for(const child of v.children)visit(child);}}
visit(descriptor.root);
const reconstructed=leaves.join('');
assert.equal(reconstructed,exactFile);assert.equal(Buffer.byteLength(reconstructed),descriptor.utf8Bytes);assert.equal(leaves.length,descriptor.leaves);
const body=journalPacket(JSON.parse(reconstructed.slice(0,-1)));
assert.deepEqual(resolveJournalPacket(body.reference,ref=>ref===body.artifact.ref?body.artifact:null),value);
assert.notEqual(body.reference.sha256,old.sha256);
const metadata={kind:'metroplat.journal.legacy-packet',version:1,source:{path:'log/2026/09/27/'+old.relativePath,sha256:digest(exactFile),bytes:Buffer.byteLength(exactFile)},raw:rawDocument.ref,legacy:{sha256:old.sha256,bytes:old.bytes},packet:body.reference};
const addressed=addressArtifact(metadata);
assert.equal(verifyArtifact(addressed.ref,addressed.canonical.text).canonical.value.raw,rawDocument.ref);

// Exact current writer ignores body disagreement when its create-only port reports EEXIST.
retained.set(old.path,'{"different":"body"}\n');
const retry=write('/fixture/log/2026/09/27',originalText);
assert.equal(retry.sha256,old.sha256);
assert.notEqual(retained.get(old.path),exactFile);
console.log(JSON.stringify({
 method:'Actual packet/artifact/text-document primitives with a synthetic large JSON body; exact current packet writer evaluated with controlled in-memory filesystem ports. No operating journal read or modified.',
 sources:[packetPath,identityPath,textPath,writerPath,indexPath].map(p=>({path:path.relative(root,p),sha256:digest(fs.readFileSync(p))})),
 observations:{rawBytes:Buffer.byteLength(exactFile),canonicalBodyBytes:body.reference.bytes,textDocumentArtifacts:rawDocument.artifacts.length,exactRawRecovered:true,jsonBodyRecovered:true,oldTextDigestDiffersFromCanonicalBodyDigest:true,fileDigestIncludesWriterLf:true,currentWriterAcceptsConflictingExistingFile:true},
 limitations:['Synthetic custody correspondence only; no importer, owner gate, durable publication, host authority or legacy source deletion accepted.','Text reconstruction here is an independent observation procedure, not a promoted production decoder.']
},null,2));
