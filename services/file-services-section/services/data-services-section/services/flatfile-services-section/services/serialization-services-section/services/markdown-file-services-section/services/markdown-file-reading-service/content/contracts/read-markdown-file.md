# Read a Markdown file

The service accepts a root directory and a relative path ending in `.md` or `.markdown`.
The resolved path must remain inside the root.
The service reads exactly one regular file as UTF-8 and returns its admitted path, text, byte count, and modification time.
It does not parse, normalize, mutate, or interpret the document.
