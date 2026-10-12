function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return blob;
}

function canvasBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error(`Could not capture ${type}.`));
      else resolve(blob);
    }, type);
  });
}

/** Save the presently rendered experiment image as a PNG. */
export async function saveCanvasPng(canvas, filename = 'holofoam.png') {
  return download(await canvasBlob(canvas, 'image/png'), filename);
}

const WEBM_MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

function supportedWebmType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  return WEBM_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/**
 * Capture a short rendered clip. The stream, recorder, and object URL are all
 * released when the capture settles; unsupported browsers receive an explicit
 * result instead of a falsely named video download.
 */
export async function recordCanvasWebm(canvas, {
  durationMs = 5000,
  frameRate = 30,
  filename = 'holofoam.webm',
  onUnsupported = () => {},
} = {}) {
  const mimeType = supportedWebmType();
  if (typeof canvas.captureStream !== 'function' || mimeType === null) {
    const message = 'This browser cannot record a WebM clip from the Holofoam canvas.';
    onUnsupported(message);
    return { supported: false, message };
  }
  if (!Number.isInteger(durationMs) || durationMs < 250 || durationMs > 60000) {
    throw new RangeError('durationMs must be an integer from 250 through 60000.');
  }
  const stream = canvas.captureStream(frameRate);
  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    const message = `This browser rejected WebM recording: ${String(error)}`;
    onUnsupported(message);
    return { supported: false, message };
  }
  const blob = await new Promise((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size > 0) chunks.push(event.data); });
    recorder.addEventListener('error', () => reject(recorder.error ?? new Error('WebM recording failed.')), { once: true });
    recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: mimeType })), { once: true });
    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  }).finally(() => stream.getTracks().forEach((track) => track.stop()));
  download(blob, filename);
  return { supported: true, mimeType, blob };
}
