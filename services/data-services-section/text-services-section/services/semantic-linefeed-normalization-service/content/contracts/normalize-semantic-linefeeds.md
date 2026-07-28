# Normalize semantic linefeeds

The service accepts one JavaScript string containing Markdown.
It returns the same document with arbitrary visual wrapping in prose replaced by one sentence per line.
It preserves frontmatter, fenced code, indented code, tables, headings, thematic breaks, link definitions, inline code, inline links, list structure, and blockquote structure.
It preserves whether the input had a final newline.
It refuses non-string input.

An actor that writes or rewrites Markdown prose must hire this operation before releasing that prose.
A consumer must not copy its sentence-boundary or Markdown-preservation implementation.
