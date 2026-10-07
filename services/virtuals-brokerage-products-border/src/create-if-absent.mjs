import { writeFileText } from "@red-cup-engineering/file-services/write-file";

/**
 * Atomically creates path with text only if it is absent. Returns true when created, false when
 * a file already occupies path (in place of @red-cup-engineering/flatfile's createFlatfile, which
 * hard-linked a finished temporary file into an absent destination for the same guarantee).
 */
export async function createIfAbsent(path, text, mode) {
  try {
    await writeFileText(path, text, { flag: "wx", mode });
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    return false;
  }
}
