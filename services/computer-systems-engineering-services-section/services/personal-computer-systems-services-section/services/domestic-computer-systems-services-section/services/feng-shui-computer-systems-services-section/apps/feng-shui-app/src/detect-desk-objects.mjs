import { detectorCandidate } from './desk-scene.mjs';

const TF_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const COCO_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
let modelPromise;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    const timer = setTimeout(() => { script.remove(); reject(new Error('The recognition download took too long. You can add objects yourself.')); }, 45000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Recognition could not download. You can add objects yourself.')); };
    document.head.append(script);
  });
}

async function loadModel() {
  if (!globalThis.tf) await loadScript(TF_URL);
  await globalThis.tf.ready();
  if (!globalThis.cocoSsd) await loadScript(COCO_URL);
  return globalThis.cocoSsd.load({base: 'lite_mobilenet_v2'});
}

/**
 * Runs local object recognition; only model code and weights are downloaded.
 * @param {HTMLImageElement} image A decoded local photo element.
 * @returns {Promise<object[]>} Object candidates, never spatial facts.
 * @throws {Error} When model loading or image recognition fails.
 */
export async function detectDeskObjects(image) {
  modelPromise ??= loadModel().catch(error => { modelPromise = undefined; throw error; });
  const model = await modelPromise;
  const predictions = await model.detect(image);
  return predictions.flatMap((prediction, index) => {
    try { return [detectorCandidate(prediction, {widthPx: image.naturalWidth, heightPx: image.naturalHeight}, `detector-${index}`)]; }
    catch { return []; }
  });
}
