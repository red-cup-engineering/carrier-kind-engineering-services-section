import { editCandidate, exportDeskScene } from './desk-scene.mjs';
import { detectDeskObjects } from './detect-desk-objects.mjs';
import { retrieveDeskAdvice, validateDeskCorpus } from './retrieve-desk-advice.mjs';

const $ = id => document.getElementById(id);
const scene = {image: null, detections: [], sceneFacts: [], tradition: 'not stated'};
let corpus;
let result;
let photoRevision = 0;
let candidateSequence = 0;
const factLabels = {
  user_confirms_items_are_clutter_or_unwanted: 'Confirm that you have items you want to sort or remove.',
  user_confirmed_door_location: 'Confirm where the relevant doorway is.',
  user_confirmed_desk_is_movable: 'Confirm that you can move the desk or change where you sit.',
  user_confirmed_desk_is_not_movable: 'Confirm that the desk position is fixed.',
  user_confirmed_seated_door_visibility: 'Confirm that you already have a clear view of the doorway.',
  user_confirmed_seated_door_visibility_is_absent_or_side_on: 'Confirm that the doorway is out of view or side-on while seated.',
  user_confirmed_mirror_is_acceptable: 'Confirm whether you would be comfortable trying a small mirror.',
};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function sourceLink(source) {
  const link = node('a', source.title);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function clearAdvice(message = 'Your answers changed. Explore a small change when you’re ready.') {
  result = undefined;
  $('advice-list').replaceChildren();
  $('missing-facts').replaceChildren();
  $('advice-status').textContent = message;
}

function updateApproach() {
  scene.tradition = $('tradition').value;
  const btb = scene.tradition !== 'not stated';
  $('btb-questions').hidden = !btb;
  $('clutter').closest('label').hidden = btb;
  $('tradition-description').textContent = btb ? 'Uses only passages that explicitly name BTB Feng Shui. These describe a tradition’s practices, not demonstrated outcomes.' : 'A personal reflection about getting a desk in order. The source does not name a Feng Shui school.';
  if (corpus) renderSources();
}

function readFacts() {
  const kinds = [];
  if ($('clutter').checked) kinds.push('user_confirms_items_are_clutter_or_unwanted');
  if ($('door-location').checked) kinds.push('user_confirmed_door_location');
  if ($('mirror').checked) kinds.push('user_confirmed_mirror_is_acceptable');
  if ($('movability').value === 'movable') kinds.push('user_confirmed_desk_is_movable');
  if ($('movability').value === 'fixed') kinds.push('user_confirmed_desk_is_not_movable');
  if ($('visibility').value === 'visible') kinds.push('user_confirmed_seated_door_visibility');
  if ($('visibility').value === 'absent') kinds.push('user_confirmed_seated_door_visibility_is_absent_or_side_on');
  scene.sceneFacts = kinds.map(kind => ({id: kind, kind, value: true, confirmedBy: 'person'}));
}

function renderSources() {
  const claims = corpus.claims.filter(claim => claim.tradition === scene.tradition);
  const ids = new Set(claims.map(claim => claim.source_id));
  $('sources-list').replaceChildren(...corpus.sources.filter(source => ids.has(source.id)).map(source => {
    const item = node('div', undefined, 'source-item');
    item.append(sourceLink(source), node('p', `${source.author} · ${source.published_date === 'unknown' ? 'Publication date not stated' : source.published_date}`, 'fine-print'));
    for (const claim of claims.filter(claim => claim.source_id === source.id)) item.append(node('p', claim.paraphrase));
    return item;
  }));
}

function renderObjects(openId) {
  $('object-overlay').replaceChildren();
  const cards = scene.detections.map((candidate, index) => {
    const box = node('div', undefined, 'object-box');
    const {x, y, width, height} = candidate.bboxPx;
    Object.assign(box.style, {left: `${100*x/scene.image.widthPx}%`, top: `${100*y/scene.image.heightPx}%`, width: `${100*width/scene.image.widthPx}%`, height: `${100*height/scene.image.heightPx}%`});
    box.append(node('span', `${index + 1}. ${candidate.label}`));
    $('object-overlay').append(box);
    const card = node('details', undefined, 'object-card');
    card.open = candidate.id === openId;
    card.append(node('summary', `${index + 1}. ${candidate.label} · ${candidate.origin === 'detector' ? `${Math.round(candidate.confidence*100)}% model confidence` : 'added or edited by you'}`));
    const form = node('form');
    const label = node('label', 'Object name');
    const input = node('input');
    input.value = candidate.label;
    input.name = 'label';
    input.required = true;
    input.maxLength = 100;
    label.append(input);
    form.append(label);
    const fields = node('div', undefined, 'box-fields');
    for (const [key, name] of [['x','Left (pixels)'],['y','Top (pixels)'],['width','Width (pixels)'],['height','Height (pixels)']]) {
      const field = node('label', name);
      const number = node('input');
      number.type = 'number'; number.name = key; number.step = 'any'; number.value = candidate.bboxPx[key]; number.required = true;
      field.append(number); fields.append(field);
    }
    form.append(fields, node('p', 'Changing a name or box clears detector confidence. Confidence is not a Feng Shui score.', 'fine-print'));
    const save = node('button', 'Save object'); save.type = 'submit';
    const remove = node('button', 'Remove object', 'quiet'); remove.type = 'button';
    const error = node('p', '', 'status'); error.setAttribute('role', 'status');
    form.append(save, remove, error);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const values = new FormData(form);
        const edited = editCandidate(candidate, {label: values.get('label'), bboxPx: Object.fromEntries(['x','y','width','height'].map(key => [key, Number(values.get(key))]))}, scene.image);
        scene.detections = scene.detections.map(item => item.id === candidate.id ? edited : item);
        renderObjects(candidate.id);
        clearAdvice('Object updated. Check your answers before exploring a change.');
      } catch (cause) { error.textContent = cause.message; }
    });
    remove.addEventListener('click', () => { scene.detections = scene.detections.filter(item => item.id !== candidate.id); renderObjects(); clearAdvice(); });
    card.append(form);
    return card;
  });
  $('object-list').replaceChildren(...cards);
  if (!cards.length) $('object-list').append(node('p', 'No objects marked yet. Try recognition or add the ones you want to review.', 'fine-print'));
}

function clearScene(resetApproach = false) {
  photoRevision += 1;
  if (scene.image) URL.revokeObjectURL(scene.image.localObjectUrl);
  scene.image = null; scene.detections = []; scene.sceneFacts = [];
  $('desk-photo').removeAttribute('src');
  $('photo-input').value = ''; $('camera-input').value = '';
  $('photo-stage').hidden = true; $('photo-empty').hidden = false; $('photo-controls').hidden = true;
  $('object-overlay').replaceChildren(); $('object-list').replaceChildren();
  $('detect-status').textContent = ''; $('photo-status').textContent = '';
  $('detect-button').disabled = false; $('export-scene').disabled = true;
  const approach = scene.tradition;
  $('facts-form').reset();
  if (!resetApproach) $('tradition').value = approach;
  updateApproach();
  clearAdvice('Choose a photo and confirm what you know to begin.');
}

async function choosePhoto(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { $('photo-status').textContent = 'Choose an image file, such as a JPG or PNG.'; return; }
  clearScene();
  const revision = photoRevision;
  const url = URL.createObjectURL(file);
  const decoded = new Image();
  try {
    decoded.src = url;
    await decoded.decode();
    if (revision !== photoRevision) { URL.revokeObjectURL(url); return; }
    scene.image = {localObjectUrl: url, widthPx: decoded.naturalWidth, heightPx: decoded.naturalHeight};
    $('desk-photo').src = url;
    $('photo-stage').hidden = false; $('photo-empty').hidden = true; $('photo-controls').hidden = false;
    $('export-scene').disabled = false;
    $('photo-status').textContent = `Photo ready. ${decoded.naturalWidth} × ${decoded.naturalHeight} pixels. Add or find objects, then tell us about your space.`;
    clearAdvice('Your photo is ready. Confirm what you know about your space.');
    renderObjects();
  } catch {
    URL.revokeObjectURL(url);
    if (revision === photoRevision) $('photo-status').textContent = 'This photo couldn’t be opened. Try a JPG or PNG, or take another photo.';
  }
}

function renderAdvice() {
  const cards = result.advice.map(advice => {
    const card = node('article', undefined, 'advice-card');
    const claims = advice.claim_ids.map(id => corpus.claims.find(claim => claim.id === id));
    card.append(node('p', scene.tradition === 'not stated' ? 'Personal desk reflection · no school stated' : 'BTB Feng Shui · source-labelled practice', 'source-tag'));
    const actions = node('ol');
    for (const action of advice.actions) actions.append(node('li', action));
    card.append(actions);
    for (const claim of claims) {
      const source = corpus.sources.find(item => item.id === claim.source_id);
      const reference = node('p'); reference.append(sourceLink(source)); card.append(reference);
    }
    const details = node('details'); details.append(node('summary', 'Read the source basis and limits'));
    for (const claim of claims) {
      details.append(node('blockquote', claim.paraphrase), node('p', `Tradition: ${claim.tradition}`), node('p', `Claim: ${claim.id} · Source: ${claim.source_id}`));
      for (const limit of claim.limits ?? []) details.append(node('p', limit));
    }
    for (const limit of advice.limits) details.append(node('p', limit));
    card.append(details);
    return card;
  });
  $('advice-list').replaceChildren(...cards);
  const clearView = scene.tradition !== 'not stated' && $('visibility').value === 'visible';
  $('advice-status').textContent = clearView ? 'You already have a clear view of the doorway. These sources don’t suggest moving your desk or adding a mirror for that situation.' : cards.length ? `${cards.length === 1 ? 'One source-linked suggestion' : `${cards.length} source-linked suggestions`}, based on what you confirmed.` : 'No suggestion is supported by these answers yet. You don’t need to change an answer to get advice.';
  const relevantMissing = clearView ? [] : result.unavailable.filter(item => {
    if ($('movability').value === 'movable' && item.missing_scene_fact_ids.includes('user_confirmed_desk_is_not_movable')) return false;
    if ($('movability').value === 'fixed' && item.missing_scene_fact_ids.includes('user_confirmed_desk_is_movable')) return false;
    return true;
  });
  const missing = relevantMissing.map(item => {
    const details = node('details');
    details.append(node('summary', 'What another suggestion would need'));
    const list = node('ul');
    for (const fact of item.missing_scene_fact_ids) list.append(node('li', factLabels[fact] ?? 'A fact this app cannot yet confirm.'));
    details.append(list); return details;
  });
  $('missing-facts').replaceChildren(...missing);
}

function download(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
  const link = node('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

for (const id of ['photo-input', 'camera-input']) $(id).addEventListener('change', event => choosePhoto(event.target.files[0]));
$('clear-photo').addEventListener('click', () => clearScene());
$('reset').addEventListener('click', () => { clearScene(true); $('photo-status').textContent = 'Everything held in this tab has been cleared.'; });
$('facts-form').addEventListener('change', () => { updateApproach(); readFacts(); clearAdvice(); });
$('facts-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!scene.image) { $('advice-status').textContent = 'Choose a desk photo first, then confirm what you know.'; return; }
  if (!corpus) { $('advice-status').textContent = 'The source corpus is unavailable. Reload this page to try again.'; return; }
  try { readFacts(); result = retrieveDeskAdvice(corpus, scene); renderAdvice(); }
  catch { clearAdvice('The source evidence could not be validated. No advice was displayed.'); }
});
$('add-object').addEventListener('click', () => {
  if (!scene.image) return;
  const {widthPx, heightPx} = scene.image;
  const candidate = editCandidate({id: `person-${++candidateSequence}`, label: 'Object', bboxPx: {x: widthPx*.15, y: heightPx*.15, width: widthPx*.35, height: heightPx*.35}}, {}, scene.image);
  scene.detections.push(candidate); renderObjects(candidate.id); clearAdvice();
});
$('detect-button').addEventListener('click', async () => {
  if (!scene.image) return;
  const revision = photoRevision;
  const snapshot = new Image(); snapshot.src = scene.image.localObjectUrl;
  $('detect-button').disabled = true;
  $('detect-status').textContent = 'Downloading recognition if needed, then looking at the photo on your device… You can keep reviewing your space.';
  try {
    await snapshot.decode();
    const candidates = await detectDeskObjects(snapshot);
    if (revision !== photoRevision) return;
    scene.detections = [...scene.detections.filter(item => item.origin === 'person'), ...candidates];
    renderObjects();
    $('detect-status').textContent = candidates.length ? `Found ${candidates.length} possible ${candidates.length === 1 ? 'object' : 'objects'}. Review the names and boxes; add anything that was missed.` : 'No objects were recognized. You can still add objects and confirm your layout yourself.';
  } catch {
    if (revision === photoRevision) $('detect-status').textContent = 'Recognition is unavailable. Add objects yourself and keep going.';
  } finally { if (revision === photoRevision) $('detect-button').disabled = false; }
});
$('export-scene').addEventListener('click', () => { readFacts(); download({scene: exportDeskScene(scene), advice: result ?? null}, 'desk-scene-and-advice.json'); });
$('export-corpus').addEventListener('click', () => { if (corpus) download(corpus, 'feng-shui-desk-corpus.v1.json'); });
addEventListener('pagehide', () => { if (scene.image) URL.revokeObjectURL(scene.image.localObjectUrl); });

try {
  const response = await fetch('/corpus.json');
  if (!response.ok) throw new Error('Corpus unavailable.');
  corpus = validateDeskCorpus(await response.json());
  updateApproach(); $('export-corpus').disabled = false;
  $('corpus-status').textContent = `Shared corpus ${corpus.corpus.version}. Only sources for your chosen approach appear above.`;
} catch {
  $('corpus-status').textContent = 'The source corpus could not be loaded or validated. Photo review still works. Reload to try retrieving the sources again.';
}
