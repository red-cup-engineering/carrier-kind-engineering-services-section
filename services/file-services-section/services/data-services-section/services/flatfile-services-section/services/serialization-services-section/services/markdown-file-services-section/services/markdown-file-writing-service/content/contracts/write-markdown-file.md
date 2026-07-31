# Write a Markdown file

The service accepts a root directory, a relative `.md` or `.markdown` path, a JavaScript string, and an explicit `create`, `replace`, or `upsert` mode.
It hires the Markdown file reader to establish current state and the semantic-linefeed normalizer to establish released prose form.
It writes through a same-directory temporary file and atomic rename.
It refuses traversal, non-Markdown paths, create-over-existing, and replace-over-absent requests.
It returns the exact released text and whether the file changed or was created.
