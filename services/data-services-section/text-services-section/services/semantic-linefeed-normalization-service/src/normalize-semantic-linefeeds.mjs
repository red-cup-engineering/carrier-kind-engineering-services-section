const ABBREVIATIONS = new Set([
  "adj", "adm", "adv", "al", "app", "apr", "aug", "ave", "capt", "cf", "ch",
  "co", "col", "corp", "dec", "dept", "dr", "e.g", "ed", "eds", "etc",
  "feb", "fig", "gen", "gov", "i.e", "inc", "jan", "jr", "jul", "jun",
  "ltd", "mar", "mr", "mrs", "ms", "mt", "no", "nov", "oct", "op",
  "pl", "prof", "rep", "rev", "sec", "sen", "sep", "sr", "st", "u.k",
  "u.s", "vs",
]);

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_ITEM = /^(\s*)([-+*]|\d+[.)])\s+((?:\[[ xX]\]\s+)?)?(.*)$/;

function normalizeSpaces(text) {
  let normalized = text.trim().replace(/\s+/gu, " ");
  while (/(^|[^A-Za-z])([A-Za-z])\. (?=[A-Za-z]\.)/u.test(normalized)) {
    normalized = normalized.replace(/(^|[^A-Za-z])([A-Za-z])\. (?=[A-Za-z]\.)/gu, "$1$2.");
  }
  return normalized;
}

function wordBefore(text, index) {
  const match = text.slice(0, index + 1).match(/([A-Za-z](?:[A-Za-z]|\.)*)\.$/u);
  return match?.[1]?.toLowerCase() ?? "";
}

function isAbbreviation(text, index) {
  const word = wordBefore(text, index);
  return ABBREVIATIONS.has(word) || /^[a-z](?:\.[a-z])+$/u.test(word);
}

function linkDestinationEnd(text, index) {
  if (text[index] !== "]" || text[index + 1] !== "(") return index;
  let depth = 0;
  for (let cursor = index + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] === "\\") {
      cursor += 1;
    } else if (text[cursor] === "(") {
      depth += 1;
    } else if (text[cursor] === ")") {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return index;
}

function sentenceEnd(text, punctuationIndex) {
  let end = punctuationIndex;
  while (end + 1 < text.length) {
    const next = text[end + 1];
    if (`\"'’”)]}`.includes(next)) {
      end += 1;
      const linkEnd = linkDestinationEnd(text, end);
      if (linkEnd !== end) end = linkEnd;
      continue;
    }
    if (next === "*" || next === "_" || next === "~" || next === "`") {
      const delimiter = next;
      while (text[end + 1] === delimiter) end += 1;
      continue;
    }
    break;
  }
  return end;
}

function isSentenceBoundary(text, punctuationIndex, end) {
  const punctuation = text[punctuationIndex];
  if (punctuation === ".") {
    if (isAbbreviation(text, punctuationIndex)) return false;
    if (/\d/u.test(text[punctuationIndex - 1] ?? "") && /\d/u.test(text[punctuationIndex + 1] ?? "")) return false;
    if (text[punctuationIndex + 1] === ".") return false;
  }

  let next = end + 1;
  while (next < text.length && /\s/u.test(text[next])) next += 1;
  if (next >= text.length) return true;

  if (/^[A-Za-z]$/u.test(wordBefore(text, punctuationIndex)) && /^[A-Z]/u.test(text.slice(next))) {
    return false;
  }

  return /["'“‘(`*_\[A-Z0-9]/u.test(text[next]);
}

function splitSentences(text) {
  const normalized = normalizeSpaces(text);
  if (!normalized) return [];

  const sentences = [];
  let start = 0;
  let codeDelimiter = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] === "`" && normalized[index - 1] !== "\\") {
      let run = 1;
      while (normalized[index + run] === "`") run += 1;
      codeDelimiter = codeDelimiter === 0 ? run : codeDelimiter === run ? 0 : codeDelimiter;
      index += run - 1;
      continue;
    }
    if (codeDelimiter !== 0 || !".!?".includes(normalized[index])) continue;

    const end = sentenceEnd(normalized, index);
    if (!isSentenceBoundary(normalized, index, end)) continue;
    sentences.push(normalized.slice(start, end + 1).trim());
    start = end + 1;
    index = end;
  }

  const tail = normalized.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences.length === 0 ? [normalized] : sentences;
}

function isPreservedBlock(lines) {
  if (lines.length === 0) return true;
  if (lines.some((line) => /^\t| {4,}\S/u.test(line))) return true;
  if (lines.some((line) => /^\s*\|.*\|\s*$/u.test(line))) return true;
  if (lines.some((line) => /^ {0,3}(\[[^\]]+\]:|<[^>]+>|<!--|-->|\{\{|\}\})/u.test(line))) return true;
  return false;
}

function isStandaloneStructure(line) {
  return /^ {0,3}(#{1,6}(?:\s|$)|-{3,}\s*$|\*{3,}\s*$|_{3,}\s*$)/u.test(line);
}

function formatList(lines) {
  const items = [];
  let current = null;
  for (const line of lines) {
    const marker = line.match(LIST_ITEM);
    if (marker) {
      if (current) items.push(current);
      current = {
        prefix: `${marker[1]}${marker[2]} ${marker[3] ?? ""}`,
        indent: `${marker[1]}  `,
        text: marker[4],
      };
    } else if (current && !/^\s*$/u.test(line) && !/^\s{4,}\S/u.test(line)) {
      current.text += ` ${line.trim()}`;
    } else {
      return null;
    }
  }
  if (current) items.push(current);

  const output = [];
  for (const item of items) {
    const sentences = splitSentences(item.text);
    if (sentences.length === 0) output.push(item.prefix.trimEnd());
    else {
      output.push(`${item.prefix}${sentences[0]}`);
      output.push(...sentences.slice(1).map((sentence) => `${item.indent}${sentence}`));
    }
  }
  return output;
}

function formatBlock(lines) {
  if (isPreservedBlock(lines)) return lines;
  const list = formatList(lines);
  if (list) return list;
  if (lines.every((line) => /^ {0,3}>/u.test(line))) {
    return splitSentences(lines.map((line) => line.replace(/^ {0,3}>\s?/u, "")).join(" "))
      .map((sentence) => `> ${sentence}`);
  }
  return splitSentences(lines.join(" "));
}

/**
 * Return Markdown prose with arbitrary visual wrapping removed and one semantic
 * sentence per line. Markdown structures that are not prose are preserved.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeSemanticLinefeeds(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (text.length === 0) return "";

  const hadFinalNewline = /\r?\n$/u.test(text);
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();

  const output = [];
  let block = [];
  let fence = null;
  let inFrontmatter = lines[0] === "---";

  const flush = () => {
    if (block.length > 0) output.push(...formatBlock(block));
    block = [];
  };
  const blank = () => {
    if (output.length > 0 && output.at(-1) !== "") output.push("");
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (inFrontmatter) {
      output.push(line);
      if (index > 0 && line === "---") inFrontmatter = false;
      continue;
    }
    if (fence) {
      output.push(line);
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`, "u").test(line)) fence = null;
      continue;
    }
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      flush();
      output.push(line);
      fence = fenceMatch[1];
      continue;
    }
    if (/^\s*$/u.test(line)) {
      flush();
      blank();
      continue;
    }
    if (isStandaloneStructure(line)) {
      flush();
      output.push(line);
      continue;
    }
    block.push(line);
  }
  flush();
  while (output.at(-1) === "") output.pop();
  return `${output.join("\n")}${hadFinalNewline ? "\n" : ""}`;
}

export function semanticLinefeedNormalization(text) {
  const normalized = normalizeSemanticLinefeeds(text);
  return Object.freeze({
    text: normalized,
    changed: normalized !== text,
    normalForm: "semantic-linefeeds",
  });
}
