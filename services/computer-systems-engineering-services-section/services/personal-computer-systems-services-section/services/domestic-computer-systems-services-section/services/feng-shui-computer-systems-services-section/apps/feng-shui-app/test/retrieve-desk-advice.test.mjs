import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveDeskAdvice, validateDeskAdvice, validateDeskCorpus } from '../src/retrieve-desk-advice.mjs';

const fact = (kind, value = true, confirmedBy = 'person') => ({id: kind, kind, value, confirmedBy});
const corpus = {
  corpus: {id: 'feng-shui-test',version: 'v1'},
  sources: [{id:'src-one',title:'Test source',url:'https://example.org/source'}, {id:'src-two',title:'Another test source',url:'https://example.org/another'}],
  claims: [{id:'clm-one',source_id:'src-one',tradition:'BTB',paraphrase:'Test passage.'}, {id:'clm-two',source_id:'src-two',tradition:'not stated',paraphrase:'Test personal reflection.'}],
  recommendations: [
    {id:'rec-move',claim_ids:['clm-one'],required_scene_facts:['user_confirmed_desk_is_movable','user_confirmed_seated_door_visibility_is_absent_or_side_on'],actions:['Try an adjustment.'],limits:['No outcome is established.'],commercial_link_policy:'No links.'},
    {id:'rec-sort',claim_ids:['clm-two'],required_scene_facts:['user_confirms_items_are_clutter_or_unwanted'],actions:['Sort something you chose.'],limits:['Personal report.'],commercial_link_policy:'No links.'},
  ],
};
const moveFacts = [fact('user_confirmed_desk_is_movable'),fact('user_confirmed_seated_door_visibility_is_absent_or_side_on')];

test('no candidate detection, absent fact, false value or unknown value enables advice', () => {
  for (const sceneFacts of [[], moveFacts.slice(0,1), moveFacts.map(item => ({...item,value:false})), moveFacts.map(item => ({...item,value:'unknown'})), moveFacts.map(item => ({...item,value:1})), moveFacts.map(item => ({...item,confirmedBy:'detector'}))]) {
    assert.equal(retrieveDeskAdvice(corpus, {tradition:'BTB',sceneFacts,detections:[{label:'desk',confidence:1}]}).advice.length, 0);
  }
});

test('contradictory mobility or doorway visibility cannot enable advice', () => {
  for (const extra of [fact('user_confirmed_desk_is_not_movable'),fact('user_confirmed_seated_door_visibility'),fact('user_confirmed_desk_is_movable',false)]) {
    assert.equal(retrieveDeskAdvice(corpus, {tradition:'BTB',sceneFacts:[...moveFacts,extra]}).advice.length, 0);
  }
});

test('positive confirmed facts return exact source actions for only the selected tradition', () => {
  const result = retrieveDeskAdvice(corpus, {tradition:'BTB',sceneFacts:[...moveFacts,fact('user_confirms_items_are_clutter_or_unwanted')]});
  assert.deepEqual(result.advice.map(item=>item.recommendation_id), ['rec-move']);
  assert.deepEqual(result.retrieved, [{source_id:'src-one',claim_id:'clm-one',tradition:'BTB'}]);
  assert.deepEqual(result.advice[0].actions, corpus.recommendations[0].actions);
  assert.deepEqual(result.referrals, []);
  assert.equal(result.generation.available, false);
});

test('corpus rejects missing sources, fake claims, duplicate identifiers, unsafe links and mixed traditions', () => {
  for (const mutate of [
    c => {c.sources=[];}, c => {c.recommendations[0].claim_ids=['fake'];}, c => {c.claims.push(c.claims[0]);},
    c => {c.sources[0].url='javascript:alert(1)';}, c => {c.recommendations[0].claim_ids.push('clm-two');},
  ]) { const invalid=structuredClone(corpus); mutate(invalid); assert.throws(()=>validateDeskCorpus(invalid), TypeError); }
});

test('result rejects invented, nonretrieved or mismatched citations, altered actions and referrals', () => {
  const valid = retrieveDeskAdvice(corpus,{tradition:'BTB',sceneFacts:moveFacts});
  for (const mutate of [
    r => {r.retrieved=[];}, r=>{r.retrieved[0].source_id='src-two';}, r=>{r.advice[0].claim_ids=['fake'];},
    r=>{r.advice[0].recommendation_id='fake';}, r=>{r.advice[0].actions=['Invented promise'];},
    r=>{r.referrals.push({url:'https://example.org/buy'});}, r=>{r.retrieved[0].tradition='not stated';},
  ]) { const invalid=structuredClone(valid); mutate(invalid); assert.throws(()=>validateDeskAdvice(corpus,invalid),TypeError); }
});

test('unknown source approach fails instead of silently mixing recommendations', () => {
  assert.throws(()=>retrieveDeskAdvice(corpus,{tradition:'invented',sceneFacts:moveFacts}),TypeError);
});
