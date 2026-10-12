import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {classifyAt,readIsDecidable} from '@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification';
import {jsonProjector} from '@red-cup-engineering/computer-content-engineering-services-section/json-projector';
import {senProjector} from '../src/language/projector.mjs';
test('catalog parser retains parent and unreduced syntax with strict read grading',()=>{
 const term=['app',['lam',['var',0]],['mark','fixture']],resource={path:'fixture',content:JSON.stringify(term)};
 assert.equal(senProjector.parent,jsonProjector);assert.equal(senProjector.rung,'strict');assert.equal(readIsDecidable(senProjector),true);
 assert.equal(classifyAt(resource,[jsonProjector,senProjector]),senProjector);assert.deepEqual(senProjector.read(resource),[term]);
 assert.equal(senProjector.write([term,['star']]),[term,['star']].map(canonicalJson).join('\n'));assert.equal(senProjector.write([]),'');
});
test('catalog actual read and every emitted SEN item require admission',()=>{
 for(const value of [{plain:true},['var',0],['app',['mark','a'],['mark','b']]]){
  assert.throws(()=>senProjector.read({path:'fixture',content:JSON.stringify(value)}));assert.throws(()=>senProjector.write([['star'],value]));
 }
});
