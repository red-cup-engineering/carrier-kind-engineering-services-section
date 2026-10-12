import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPixelBox, detectorCandidate, editCandidate, exportDeskScene } from '../src/desk-scene.mjs';

const image = {widthPx: 1000, heightPx: 667};

test('model boxes clip negative coordinates and overflow in original pixels', () => {
  assert.deepEqual(clampPixelBox({x: -10, y: -1.4, width: 1050, height: 700}, image), {x: 0, y: 0, width: 1000, height: 667});
  assert.deepEqual(clampPixelBox({x: 900, y: 600, width: 200, height: 100}, image), {x: 900, y: 600, width: 100, height: 67});
});

test('nonfinite, negative-area, off-image and zero-size image boxes fail', () => {
  for (const box of [{x: 0,y: 0,width: -1,height: 5}, {x: NaN,y: 0,width: 10,height: 10}, {x: 1100,y: 0,width: 10,height: 10}]) assert.throws(() => clampPixelBox(box, image), TypeError);
  assert.throws(() => clampPixelBox({x: 0,y: 0,width: 10,height: 10}, {widthPx: 0,heightPx: 0}), TypeError);
});

test('detector results propose objects without spatial facts', () => {
  const candidate = detectorCandidate({class: 'laptop', score: .82, bbox: [20,30,100,80]}, image, 'one');
  assert.equal(candidate.origin, 'detector');
  assert.equal(candidate.confidence, .82);
  assert.equal(candidate.sceneFacts, undefined);
  assert.equal(candidate.physicalDistances, undefined);
  assert.throws(() => detectorCandidate({class: 'door', score: 2,bbox: [0,0,1,1]}, image, 'bad'), TypeError);
});

test('manual label and geometry changes discard detector confidence', () => {
  const candidate = detectorCandidate({class: 'laptop', score: .95, bbox: [20,30,100,80]}, image, 'one');
  for (const edit of [{label: 'desk'}, {bboxPx: {x: 5,y: 5,width: 30,height: 40}}]) {
    const corrected = editCandidate(candidate, edit, image);
    assert.equal(corrected.confidence, null);
    assert.equal(corrected.origin, 'person');
    assert.equal(candidate.confidence, .95);
  }
  assert.throws(() => editCandidate(candidate, {label: '  '}, image), TypeError);
});

test('scene export excludes object URL and image bytes and limits manual confidence', () => {
  const exported = exportDeskScene({image: {...image,localObjectUrl: 'blob:private',data: 'private-pixels'}, detections: [{id:'one',label:'door',bboxPx:{x:0,y:0,width:10,height:10},origin:'person',confidence:1}],sceneFacts: [],tradition:'not stated'});
  assert.deepEqual(exported.image, image);
  assert.equal(exported.detections[0].confidence, null);
  assert.equal(JSON.stringify(exported).includes('private'), false);
  assert.equal(exported.compassBearing, 'unknown');
});
