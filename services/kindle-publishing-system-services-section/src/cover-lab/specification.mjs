import { createHash } from "node:crypto";
import sharp from "sharp";
import { nearestKnownCover } from "./conventions.mjs";

export const KDP_COVER_SPEC = Object.freeze({ width: 1600, height: 2560, ratio: 1.6, maximumBytes: 50_000_000, formats: ["jpeg", "tiff"], colourspace: "srgb" });
export const TYPOGRAPHY_FONT = Object.freeze({ family: "Noto Sans", license: "OFL-1.1", source: "system font resolved by libvips/Pango; output raster contains no redistributable font program" });

const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function compositeTypography(background, { title, subtitle, author, titleAreaRatio = 0.28 }) {
  const titleSize = Math.max(150, Math.min(250, Math.round(720 * titleAreaRatio)));
  const overlay = Buffer.from(`<svg width="1600" height="2560" xmlns="http://www.w3.org/2000/svg">
    <style>.t{font-family:'Noto Sans',sans-serif;font-weight:800;fill:#fff8ea;stroke:#172439;stroke-width:5;paint-order:stroke}.s{font-family:'Noto Sans',sans-serif;font-weight:600;fill:#fff8ea}.a{font-family:'Noto Sans',sans-serif;font-weight:700;fill:#fff8ea;letter-spacing:8px}</style>
    <text class="t" x="800" y="390" text-anchor="middle" font-size="${titleSize}">${xml(title).toUpperCase()}</text>
    <text class="s" x="800" y="510" text-anchor="middle" font-size="58">${xml(subtitle)}</text>
    <text class="a" x="800" y="2390" text-anchor="middle" font-size="64">${xml(author).toUpperCase()}</text>
  </svg>`);
  return sharp(background).resize(1600, 2560, { fit: "cover" }).composite([{ input: overlay }]).toColourspace("srgb").jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toBuffer();
}

export async function validateCover(buffer, { observations = [], perceptualHash = null, defectReports = [] } = {}) {
  const metadata = await sharp(buffer).metadata();
  const failures = [];
  if (metadata.width !== 1600 || metadata.height !== 2560) failures.push("dimensions");
  if (metadata.format !== "jpeg" && metadata.format !== "tiff") failures.push("format");
  if (buffer.byteLength >= KDP_COVER_SPEC.maximumBytes) failures.push("file-size");
  if (metadata.space !== "srgb") failures.push("colourspace");
  for (const report of defectReports) for (const defect of report.defects ?? []) if (["ai-text-artifact", "hand-defect", "face-defect", "border", "price", "review-text"].includes(defect.code) && defect.present) failures.push(defect.code);
  const nearest = perceptualHash ? nearestKnownCover(perceptualHash, observations) : null;
  if (nearest && nearest.distance < 8) failures.push("known-cover-look-alike");
  return Object.freeze({ passed: failures.length === 0, failures: [...new Set(failures)].sort(), metadata: { width: metadata.width, height: metadata.height, format: metadata.format, space: metadata.space, bytes: buffer.byteLength, sha256: createHash("sha256").update(buffer).digest("hex") }, nearestKnownCover: nearest });
}
