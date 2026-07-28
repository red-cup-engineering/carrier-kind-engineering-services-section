# Markdown File Reading Service

This service owns one operation: read one bounded Markdown file as UTF-8.
It has no runtime dependencies.

```js
import { readMarkdownFile } from "@red-cup-engineering/markdown-file-reading-service";

const document = await readMarkdownFile({ root: process.cwd(), path: "README.md" });
```
