# @561-group/image-codecs

Image container header codec: a coder/decoder between the byte
representations of the four web image container formats — PNG, JPEG, GIF,
WebP — and frozen header records. Decoding reads only the container's own
header structures (PNG IHDR; the JPEG SOFn frame header, reached by walking
marker segments; the GIF logical screen descriptor; the first WebP RIFF
chunk in its VP8 / VP8L / VP8X variants). It never decompresses pixel data,
never touches the filesystem or network, and judges nothing about the image
beyond what the header states.

## Consumer contract

- **Zero runtime dependencies** (codec law L4): nothing is carried, nothing
  is borrowed.
- All returned records are frozen; functions are pure over `Uint8Array`.
- `TypeError` is thrown for malformed, truncated, or unrecognized byte
  shapes only; there are no other failure modes.
- Endianness follows each specification: PNG and JPEG fields are
  big-endian; GIF and WebP fields are little-endian.
- Dimensions are the container's own claims — `decodeImageHeader` does not
  verify them against the compressed pixel stream.

## Quick start

```ts
import { decodeImageHeader, decodePngHeader } from "@561-group/image-codecs";

// Sniff the container by magic bytes, then decode its header.
const header = decodeImageHeader(bytes); // bytes: Uint8Array
header.format; // "png" | "jpeg" | "gif" | "webp"
header.width;  // pixels, from the container's header structures
header.height;

// Or address one format directly when the container is already known.
const png = decodePngHeader(bytes);
png.bitDepth;  // 1 | 2 | 4 | 8 | 16, from IHDR
png.colorType; // 0 | 2 | 3 | 4 | 6, from IHDR
```

## Export groups

- **Header records (the objects):** `ImageHeader` (the union),
  `PngHeader` (width, height, `bitDepth`, `colorType` from IHDR —
  ISO/IEC 15948 §11.2.2), `JpegHeader` (width, height, `precision`,
  `components`, and the SOFn `marker` byte — ITU-T T.81 §B.2.2),
  `GifHeader` (width, height, `version` "87a" | "89a", `colorResolution`,
  `globalColorTableEntries` from the logical screen descriptor — GIF89a
  §17–18), `WebpHeader` (width, height, `variant`), plus `ImageFormat`
  and `WebpVariant`.
- **Decoders (the morphisms):** `decodeImageHeader` (sniffs by magic
  bytes and routes), `decodePngHeader`, `decodeJpegHeader` (walks marker
  segments to the first SOFn, skipping DHT/JPG/DAC and standalone
  markers), `decodeGifHeader`, `decodeWebpHeader` (handles `VP8 `
  keyframe dimensions per RFC 6386 §9.1, `VP8L` 14-bit packed
  dimensions, and `VP8X` 24-bit canvas size).
