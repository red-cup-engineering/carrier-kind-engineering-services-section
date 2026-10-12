import assert from "node:assert/strict";
import test from "node:test";
import { parseMultipartForm, serializeMultipartForm } from "../src/code-http-multipart-form-data.mts";

test("round-trips fields and files in multipart form-data", () => {
  const boundary = "atomic-boundary";
  const body = serializeMultipartForm([
    { name: "title", data: "hello" },
    { name: "asset", filename: "a.txt", contentType: "text/plain", data: "file body" },
  ], boundary);
  const form = parseMultipartForm(body, boundary);
  assert.equal(form.get("title"), "hello");
  assert.equal(form.file("asset")?.filename, "a.txt");
  assert.equal(form.file("asset")?.text(), "file body");
});
