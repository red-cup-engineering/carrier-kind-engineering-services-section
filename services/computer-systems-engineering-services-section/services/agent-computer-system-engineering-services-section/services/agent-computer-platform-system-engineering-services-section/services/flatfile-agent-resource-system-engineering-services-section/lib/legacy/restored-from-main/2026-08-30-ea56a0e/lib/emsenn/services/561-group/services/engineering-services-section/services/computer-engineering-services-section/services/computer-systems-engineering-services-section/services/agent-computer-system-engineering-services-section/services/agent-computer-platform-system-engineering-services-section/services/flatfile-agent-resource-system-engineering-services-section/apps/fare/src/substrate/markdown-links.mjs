import { classify } from "./link-kind.mjs";

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const FENCE_RE = /^\s*```/;

function stripInlineCode(line) {
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    if (line[i] === "`") {
      const close = line.indexOf("`", i + 1);
      if (close === -1) {
        out += line.slice(i);
        break;
      }
      out += " ".repeat(close - i + 1);
      i = close + 1;
    } else {
      out += line[i];
      i += 1;
    }
  }
  return out;
}

export function parseLinks(body) {
  const out = [];
  let inFence = false;
  const lines = body.split("\n");
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const scanline = stripInlineCode(line);
    for (const match of scanline.matchAll(LINK_RE)) {
      const target = match[2].trim();
      out.push({
        text: match[1],
        targetRaw: target,
        line: idx + 1,
        kind: classify(target),
      });
    }
  }
  return out;
}
