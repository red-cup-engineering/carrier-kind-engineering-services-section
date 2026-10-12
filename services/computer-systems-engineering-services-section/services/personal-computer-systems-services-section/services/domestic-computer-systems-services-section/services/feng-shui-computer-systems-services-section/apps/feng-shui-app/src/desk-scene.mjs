/** @typedef {{x:number,y:number,width:number,height:number}} PixelBox */
/** @typedef {{widthPx:number,heightPx:number}} ImageSize */

/**
 * Clips a positive box to the original image bounds.
 * @param {PixelBox} box Image-pixel box.
 * @param {ImageSize} image Original image dimensions.
 * @returns {PixelBox} The visible portion of the box.
 * @throws {TypeError} When the image or box is invalid or has no visible area.
 */
export function clampPixelBox(box, image) {
  const { widthPx, heightPx } = image ?? {};
  if (![widthPx, heightPx].every(n => Number.isFinite(n) && n > 0)) throw new TypeError('Choose a readable photo first.');
  if (!box || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(box[key])) || box.width <= 0 || box.height <= 0) throw new TypeError('Object boxes need positive width and height.');
  const x = Math.max(0, Math.min(widthPx, box.x));
  const y = Math.max(0, Math.min(heightPx, box.y));
  const right = Math.max(0, Math.min(widthPx, box.x + box.width));
  const bottom = Math.max(0, Math.min(heightPx, box.y + box.height));
  if (right <= x || bottom <= y) throw new TypeError('Keep the object box inside the photo.');
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Converts a model observation to an unconfirmed object candidate.
 * @param {{class:string,score:number,bbox:number[]}} prediction COCO-SSD output.
 * @param {ImageSize} image Image size.
 * @param {string} id Candidate identity.
 * @returns {object} A detector candidate without scene facts.
 * @throws {TypeError} When detector evidence is malformed.
 */
export function detectorCandidate(prediction, image, id) {
  if (!prediction || typeof prediction.class !== 'string' || !prediction.class.trim() || !Number.isFinite(prediction.score) || prediction.score < 0 || prediction.score > 1 || !Array.isArray(prediction.bbox) || prediction.bbox.length !== 4) throw new TypeError('The detector returned an unreadable object.');
  const [x, y, width, height] = prediction.bbox;
  return { id, label: prediction.class.trim(), bboxPx: clampPixelBox({x, y, width, height}, image), confidence: prediction.score, origin: 'detector' };
}

/**
 * Applies a person's correction without retaining detector certainty.
 * @param {object} candidate Existing candidate.
 * @param {{label?:string,bboxPx?:PixelBox}} edit Manual correction.
 * @param {ImageSize} image Image size.
 * @returns {object} A person-labelled candidate.
 * @throws {TypeError} When the label or box is invalid.
 */
export function editCandidate(candidate, edit, image) {
  const label = (edit.label ?? candidate.label)?.trim();
  if (!label || label.length > 100) throw new TypeError('Give the object a name of 1 to 100 characters.');
  return { id: candidate.id, label, bboxPx: clampPixelBox(edit.bboxPx ?? candidate.bboxPx, image), confidence: null, origin: 'person' };
}

/**
 * Exports reviewed scene data without the photo or its object URL.
 * @param {object} scene Browser-held scene.
 * @returns {object} A JSON-compatible scene with unknown physical geometry.
 */
export function exportDeskScene(scene) {
  const image = scene.image ? { widthPx: scene.image.widthPx, heightPx: scene.image.heightPx } : null;
  return { version: 1, image, tradition: scene.tradition, detections: (scene.detections ?? []).map(item => ({id: item.id, label: item.label, bboxPx: {...item.bboxPx}, confidence: item.origin === 'detector' ? item.confidence : null, origin: item.origin})), sceneFacts: (scene.sceneFacts ?? []).map(({id, kind, value, confirmedBy}) => ({id, kind, value, confirmedBy})), physicalDistances: 'unknown', compassBearing: 'unknown' };
}
