import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {EnterpriseExecutionWorker} from "../src/enterprise-execution.mjs";
const dir=await mkdtemp(join(tmpdir(),"admission-transport-"));
const file=join(dir,"receiver.mjs");
await writeFile(file,`import {parentPort} from "node:worker_threads";
parentPort.on("message",message=>parentPort.postMessage({kind:"result",id:message.id,value:message.context}));
parentPort.postMessage({kind:"ready"});`);
const worker=new EnterpriseExecutionWorker({hostPath:dir,environment:process.env,workerUrl:pathToFileURL(file)});
const context={invocation:{id:"fixture-invocation",subject:"fixture-hand"},decision:{ok:true,reading:"held",evidence:["admitted-by:office:fixture"]},startedAt:"2026-10-06T00:00:00.000Z",evidence:[]};
try {
 const received=await worker.execute({operation:"enterprise-work-run",input:{},arguments:{},context});
 assert.deepEqual(received,context);
} finally {await worker.close();await rm(dir,{recursive:true,force:true});}
