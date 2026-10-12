const EXCLUSIVE_FACTS = [
  ['user_confirmed_desk_is_movable', 'user_confirmed_desk_is_not_movable'],
  ['user_confirmed_seated_door_visibility', 'user_confirmed_seated_door_visibility_is_absent_or_side_on'],
];

function strings(value) { return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim()); }
function indexed(records, kind) {
  if (!Array.isArray(records)) throw new TypeError(`The corpus needs ${kind} records.`);
  const map = new Map();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id.trim() || map.has(record.id)) throw new TypeError(`Invalid or duplicate ${kind} identifier.`);
    map.set(record.id, record);
  }
  return map;
}

/**
 * Validates the shared corpus's advice-bearing records and reference graph.
 * @param {object} corpus Canonical science corpus data.
 * @returns {object} The validated corpus.
 * @throws {TypeError} For malformed records, unsafe source URLs or missing references.
 */
export function validateDeskCorpus(corpus) {
  if (!corpus?.corpus?.id || !corpus.corpus.version) throw new TypeError('The corpus identity is missing.');
  const sources = indexed(corpus.sources, 'source');
  const claims = indexed(corpus.claims, 'claim');
  indexed(corpus.recommendations, 'recommendation');
  for (const source of sources.values()) {
    let url;
    try { url = new URL(source.url); } catch { throw new TypeError('Invalid source URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || typeof source.title !== 'string' || !source.title.trim()) throw new TypeError('Sources need a title and a safe HTTPS URL.');
  }
  for (const claim of claims.values()) {
    if (!sources.has(claim.source_id) || typeof claim.tradition !== 'string' || !claim.tradition.trim() || typeof claim.paraphrase !== 'string' || !claim.paraphrase.trim()) throw new TypeError('A claim has a missing source, tradition, or passage.');
  }
  for (const rec of corpus.recommendations) {
    if (!strings(rec.claim_ids) || !rec.claim_ids.length || !strings(rec.required_scene_facts) || !rec.required_scene_facts.length || !strings(rec.actions) || !rec.actions.length || !strings(rec.limits) || typeof rec.commercial_link_policy !== 'string') throw new TypeError('A recommendation is incomplete.');
    if (rec.claim_ids.some(id => !claims.has(id))) throw new TypeError('A recommendation names a missing claim.');
    if (new Set(rec.claim_ids.map(id => claims.get(id).tradition)).size !== 1) throw new TypeError('A recommendation mixes traditions.');
  }
  return corpus;
}

function confirmedFacts(facts) {
  const grouped = new Map();
  for (const fact of facts ?? []) {
    if (typeof fact?.kind !== 'string') continue;
    const values = grouped.get(fact.kind) ?? [];
    values.push(fact);
    grouped.set(fact.kind, values);
  }
  const confirmed = new Set([...grouped].filter(([, values]) => values.every(fact => fact.value === true && fact.confirmedBy === 'person')).map(([kind]) => kind));
  for (const [left, right] of EXCLUSIVE_FACTS) {
    if (confirmed.has(left) && confirmed.has(right)) { confirmed.delete(left); confirmed.delete(right); }
  }
  return confirmed;
}

/**
 * Retrieves source-linked advice for one tradition and positive person-confirmed facts.
 * @param {object} corpus Shared science corpus.
 * @param {{tradition:string,sceneFacts?:object[]}} request Reviewed facts; detections are ignored.
 * @returns {object} Closed deterministic guidance with no referrals or generated text.
 * @throws {TypeError} For invalid corpus or unknown tradition.
 */
export function retrieveDeskAdvice(corpus, request) {
  validateDeskCorpus(corpus);
  if (!corpus.claims.some(claim => claim.tradition === request.tradition)) throw new TypeError('Choose a source approach from this corpus.');
  const claims = new Map(corpus.claims.map(claim => [claim.id, claim]));
  const confirmed = confirmedFacts(request.sceneFacts);
  const result = {tradition: request.tradition, retrieved: [], advice: [], unavailable: [], referrals: [], generation: {available: false, reason: 'Generated advice is not connected to an assayed provider.'}};
  for (const rec of corpus.recommendations) {
    if (!rec.claim_ids.every(id => claims.get(id).tradition === request.tradition)) continue;
    const missing = rec.required_scene_facts.filter(kind => !confirmed.has(kind));
    if (missing.length) { result.unavailable.push({recommendation_id: rec.id, missing_scene_fact_ids: missing}); continue; }
    for (const id of rec.claim_ids) {
      const claim = claims.get(id);
      if (!result.retrieved.some(item => item.claim_id === id)) result.retrieved.push({source_id: claim.source_id, claim_id: id, tradition: claim.tradition});
    }
    result.advice.push({recommendation_id: rec.id, claim_ids: [...rec.claim_ids], actions: [...rec.actions], limits: [...rec.limits], evidence: 'all-required-facts-confirmed'});
  }
  validateDeskAdvice(corpus, result);
  return result;
}

/**
 * Rejects unsupported recommendation or citation references and altered source actions.
 * @param {object} corpus Validated corpus.
 * @param {object} result Retrieved deterministic advice.
 * @returns {object} The admitted result.
 * @throws {TypeError} When evidence falls outside the retrieved source set.
 */
export function validateDeskAdvice(corpus, result) {
  validateDeskCorpus(corpus);
  if (!Array.isArray(result.retrieved) || !Array.isArray(result.advice) || !Array.isArray(result.referrals) || result.referrals.length) throw new TypeError('Advice must carry retrieved evidence and no commercial links.');
  const retrieved = new Set();
  for (const ref of result.retrieved) {
    const claim = corpus.claims.find(item => item.id === ref.claim_id);
    if (!claim || claim.source_id !== ref.source_id || claim.tradition !== ref.tradition || ref.tradition !== result.tradition) throw new TypeError('Advice names evidence outside the selected sources.');
    retrieved.add(ref.claim_id);
  }
  for (const advice of result.advice) {
    const rec = corpus.recommendations.find(item => item.id === advice.recommendation_id);
    if (!rec || !strings(advice.claim_ids) || JSON.stringify(advice.claim_ids) !== JSON.stringify(rec.claim_ids) || advice.claim_ids.some(id => !retrieved.has(id)) || JSON.stringify(advice.actions) !== JSON.stringify(rec.actions) || JSON.stringify(advice.limits) !== JSON.stringify(rec.limits) || advice.evidence !== 'all-required-facts-confirmed') throw new TypeError('Advice is outside the retrieved recommendation contract.');
  }
  return result;
}
