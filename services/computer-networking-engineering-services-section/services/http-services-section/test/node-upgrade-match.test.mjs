import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeMatches,createHttpServer} from '@red-cup-engineering/http-services-section/node-server';

// The existing listener owns upgrade matching. Realm placement consumes this
// exact pure helper through the already-public node-server entry point.
test('public native upgrade matcher preserves the listener contract',()=>{
 assert.equal(typeof createHttpServer,'function');const request={url:'/socket?selected=1',headers:{host:'fixture.example'}};
 assert.equal(upgradeMatches(undefined,request),true);assert.equal(upgradeMatches('/socket',request),true);assert.equal(upgradeMatches('/other',request),false);
 assert.equal(upgradeMatches(/^\/socket$/,request),true);assert.equal(upgradeMatches(path=>path==='/socket',request),true);
 assert.equal(upgradeMatches(value=>value===request,request),true);assert.equal(upgradeMatches(()=>{throw Error('refuse');},request),false);
 assert.equal(upgradeMatches('/',{}),true);
});
