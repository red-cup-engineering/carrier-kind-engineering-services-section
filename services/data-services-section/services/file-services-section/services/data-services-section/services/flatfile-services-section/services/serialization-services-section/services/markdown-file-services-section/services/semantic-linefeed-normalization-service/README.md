# Semantic Linefeed Normalization Service

This Red Cup actor owns one operation: normalize Markdown prose to semantic linefeeds.
It takes a JavaScript string and returns a JavaScript string.
It has no runtime dependencies.

```js
import { normalizeSemanticLinefeeds } from "@red-cup-engineering/semantic-linefeed-normalization-service";

normalizeSemanticLinefeeds("One sentence wraps across\na column. Another follows.");
// "One sentence wraps across a column.\nAnother follows."
```

The command-line face reads standard input and writes standard output.

```sh
semantic-linefeed-normalize < README.md > README.normalized.md
```

The HTTP actor face provides `POST /invoke`, `GET /health`, `GET /actor`, and `GET /.well-known/agent-card.json`.
`POST /invoke` accepts `{ "text": "..." }` and returns the normalized text, whether it changed, and the named normal form.

Consumers must call this package rather than copying its sentence-boundary logic.
