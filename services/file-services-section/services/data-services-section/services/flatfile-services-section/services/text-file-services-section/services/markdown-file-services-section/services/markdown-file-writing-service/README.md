# Markdown File Writing Service

This service atomically writes one bounded Markdown file.
Every write hires the semantic-linefeed normalization service.

```js
import { writeMarkdownFile } from "@red-cup-engineering/markdown-file-writing-service";

await writeMarkdownFile({
  root: process.cwd(),
  path: "README.md",
  text: "One sentence wraps across\na column. Another follows.\n",
  mode: "replace",
});
```
