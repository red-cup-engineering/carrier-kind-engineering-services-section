import { copyFile } from "node:fs/promises";
import sharp from "sharp";

/**
 * The KDP cover for a fabricated edition: the edition's own cover (the ebook
 * section sets it, over an adopted illustration or from the tokens alone).
 * A 1600 x 2560 JPEG is delivered byte for byte, so KDP receives the cover the
 * EPUB carries; any other raster is fitted to KDP's ideal JPEG.
 */
export async function materializeEditionCover({ cover, outputJpeg }) {
  const { format, width, height } = await sharp(cover).metadata();
  if (format === "jpeg" && width === 1600 && height === 2560) {
    await copyFile(cover, outputJpeg);
    return Object.freeze({ path: outputJpeg, source: cover, method: "edition-cover" });
  }
  await sharp(cover).flatten({ background: "white" }).resize(1600, 2560, { fit: "cover" }).toColourspace("srgb").jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(outputJpeg);
  return Object.freeze({ path: outputJpeg, source: cover, method: "fitted-to-kdp" });
}
