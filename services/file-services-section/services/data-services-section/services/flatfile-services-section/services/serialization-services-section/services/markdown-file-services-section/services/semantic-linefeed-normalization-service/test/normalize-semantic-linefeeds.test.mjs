import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  normalizeSemanticLinefeeds,
  semanticLinefeedNormalization,
} from "../src/normalize-semantic-linefeeds.mjs";
import { createSemanticLinefeedServer } from "../bin/server.mjs";

test("unwraps arbitrary columns and emits one sentence per line", () => {
  assert.equal(
    normalizeSemanticLinefeeds("Alpha beta wraps across\nan arbitrary column. Gamma follows.\n"),
    "Alpha beta wraps across an arbitrary column.\nGamma follows.\n",
  );
});

test("keeps closing quotes and Markdown emphasis with their sentence", () => {
  assert.equal(
    normalizeSemanticLinefeeds('Morgan said, "This is **important.**" Another sentence follows.\n'),
    'Morgan said, "This is **important.**"\nAnother sentence follows.\n',
  );
});

test("does not split abbreviations, initials, decimals, links, or inline code", () => {
  const input = "Dr. M. Sennhauser used v1.2 and `thing.stop()`. Read [the note.](https://example.test/a_(b)) Then continue.\n";
  assert.equal(
    normalizeSemanticLinefeeds(input),
    "Dr. M. Sennhauser used v1.2 and `thing.stop()`.\nRead [the note.](https://example.test/a_(b))\nThen continue.\n",
  );
});

test("preserves Markdown structures while normalizing prose", () => {
  const input = [
    "---", "title: Example", "---", "# Heading. Not prose.", "", "- First sentence. Second sentence.",
    "", "> Quoted sentence wraps", "> across a column. Another follows.", "", "| A | B |", "| - | - |",
    "| One. Two. | Three |", "", "```js", "const x = 'Do not. split.';", "```", "",
  ].join("\n");
  const expected = [
    "---", "title: Example", "---", "# Heading. Not prose.", "", "- First sentence.", "  Second sentence.",
    "", "> Quoted sentence wraps across a column.", "> Another follows.", "", "| A | B |", "| - | - |",
    "| One. Two. | Three |", "", "```js", "const x = 'Do not. split.';", "```", "",
  ].join("\n");
  assert.equal(normalizeSemanticLinefeeds(input), expected);
});

test("is idempotent and preserves final-newline state", () => {
  const withNewline = "One sentence.\nAnother sentence.\n";
  const withoutNewline = "One sentence. Another sentence.";
  assert.equal(normalizeSemanticLinefeeds(normalizeSemanticLinefeeds(withNewline)), withNewline);
  assert.equal(normalizeSemanticLinefeeds(withoutNewline), "One sentence.\nAnother sentence.");
});

test("returns the actor result and refuses non-string input", () => {
  assert.deepEqual(semanticLinefeedNormalization("One. Two."), {
    text: "One.\nTwo.", changed: true, normalForm: "semantic-linefeeds",
  });
  assert.throws(() => normalizeSemanticLinefeeds(null), /text must be a string/u);
});

test("CLI is the same implementation", () => {
  const result = spawnSync(process.execPath, ["bin/semantic-linefeed-normalize.mjs"], {
    cwd: new URL("..", import.meta.url), input: "One wraps\nhere. Two.\n", encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "One wraps here.\nTwo.\n");
});

test("HTTP actor exposes health, ActivityPub, A2A, and invocation faces", async () => {
  const server = createSemanticLinefeedServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
    assert.equal((await (await fetch(`${base}/actor`)).json()).type, "Service");
    assert.equal((await (await fetch(`${base}/.well-known/agent-card.json`)).json()).skills[0].id, "normalize-semantic-linefeeds");
    const invoked = await (await fetch(`${base}/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "One wraps\nhere. Two.\n" }),
    })).json();
    assert.deepEqual(invoked, {
      text: "One wraps here.\nTwo.\n",
      changed: true,
      normalForm: "semantic-linefeeds",
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
