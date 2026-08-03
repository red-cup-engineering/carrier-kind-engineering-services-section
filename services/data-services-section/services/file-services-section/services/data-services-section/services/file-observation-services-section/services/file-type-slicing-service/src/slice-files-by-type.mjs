import { extname } from "node:path";

const SLICE_TYPE = "FileTypeSlice";

// The lowercased final extension, without its leading dot; "" when a path
// has none (a dotfile like ".gitignore" has none by this same rule, since
// node:path treats the leading dot as the whole name, not an extension).
function extensionOf(path) {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const ext = extname(base);
  return ext ? ext.slice(1).toLowerCase() : "";
}

// Pure grouping over an already-walked file list: no filesystem access, no
// re-reading of paths. Use to turn one PosixPathWalk into counts and byte
// totals per extension before handing either off to a graphing service.
export function sliceFilesByType({ files } = {}) {
  if (!Array.isArray(files)) throw new TypeError("files must be an array");

  const slices = {};
  let totalCount = 0;
  let totalBytes = 0;

  for (const file of files) {
    if (typeof file?.path !== "string" || typeof file?.bytes !== "number") {
      throw new TypeError("each file needs a string path and a numeric bytes");
    }
    const ext = extensionOf(file.path);
    const slice = slices[ext] ?? (slices[ext] = { count: 0, bytes: 0, paths: [] });
    slice.count += 1;
    slice.bytes += file.bytes;
    slice.paths.push(file.path);
    totalCount += 1;
    totalBytes += file.bytes;
  }

  for (const ext of Object.keys(slices)) {
    slices[ext].paths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    slices[ext] = Object.freeze({ ...slices[ext], paths: Object.freeze(slices[ext].paths) });
  }

  return Object.freeze({
    type: SLICE_TYPE,
    slices: Object.freeze(slices),
    total: Object.freeze({ count: totalCount, bytes: totalBytes }),
  });
}
