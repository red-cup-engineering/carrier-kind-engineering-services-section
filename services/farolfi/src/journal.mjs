import { globSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  balance,
  close,
  commodity,
  event,
  include,
  malformed,
  note,
  open,
  option,
  pad,
  posting,
  price,
  transaction,

} from "@red-cup-engineering/organizing/accounting/ledger";
import { gradedFromParts } from "@red-cup-engineering/computer-data-engineering-services-section/number/graded";

function linesOf(text) {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines.map((raw, index) => {
    let indent = 0;
    while (indent < raw.length && (raw[indent] === " " || raw[indent] === "\t")) indent++;
    let semicolon = -1;
    let quoted = false;
    let escaped = false;
    for (let cursor = 0; cursor < raw.length; cursor += 1) {
      const character = raw[cursor];
      if (escaped) { escaped = false; continue; }
      if (character === "\\" && quoted) { escaped = true; continue; }
      if (character === '"') { quoted = !quoted; continue; }
      if (character === ";" && !quoted) { semicolon = cursor; break; }
    }
    return {
      number: index + 1,
      raw,
      indent,
      content: (semicolon < 0 ? raw : raw.slice(0, semicolon)).trim(),
    };
  });
}

function blocksOf(lines) {
  const blocks = [];
  let current = null;
  const finish = () => {
    if (current) blocks.push(current);
    current = null;
  };
  for (const line of lines) {
    if (line.content === "") {
      finish();
    } else if (line.indent === 0) {
      finish();
      current = { header: line, body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      blocks.push({ header: line, body: [] });
    }
  }
  finish();
  return blocks;
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function decimalParts(value, decimalMark) {
  let body = value.trim();
  if (body === "") return null;
  let sign = 1n;
  if (body.startsWith("+")) body = body.slice(1);
  else if (body.startsWith("-")) {
    sign = -1n;
    body = body.slice(1);
  }
  const grouping = decimalMark === "." ? "," : ".";
  body = body.split(grouping).join("");
  const pieces = body.split(decimalMark);
  if (pieces.length > 2) return null;
  const integer = pieces[0] ?? "";
  const fraction = pieces[1] ?? "";
  if (!/^\d*$/.test(integer) || !/^\d*$/.test(fraction) || integer + fraction === "") return null;
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = sign * BigInt((integer || "0") + fraction);
  const divisor = gcd(numerator, denominator);
  return { num: numerator / divisor, den: denominator / divisor };
}

function quantity(value, decimalMark) {
  const mark = decimalMark === "." ? "\\." : ",";
  const grouping = decimalMark === "." ? "," : "\\.";
  const match = new RegExp(`[-+]?[\\d${grouping}]*${mark}?[\\d${grouping}]+`).exec(value.trim());
  if (!match) return null;
  const before = value.trim().slice(0, match.index).trim();
  const after = value.trim().slice(match.index + match[0].length).trim();
  if ((before === "") === (after === "")) return null;
  const commodityName = before || after;
  const parsed = decimalParts(match[0], decimalMark);
  return parsed && commodityName ? gradedFromParts(parsed.num, parsed.den, commodityName) : null;
}

function amountExpression(value, decimalMark)

 {
  let rest = value.trim();
  let costValue = null;
  let priceValue = null;
  const totalCost = /\{\{([^}]*)\}\}/.exec(rest);
  const unitCost = totalCost ? null : /\{([^}]*)\}/.exec(rest);
  const costMatch = totalCost ?? unitCost;
  if (costMatch) {
    const parts = (costMatch[1] ?? "").match(/"(?:\\.|[^"\\])*"|[^,]+/g) ?? [];
    let costAmount = null;
    let date;
    let label;
    for (const raw of parts) {
      const part = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) date = part;
      else if (part.startsWith('"') && part.endsWith('"')) {
        try { label = JSON.parse(part); } catch { label = part.slice(1, -1); }
      } else if (costAmount === null) costAmount = quantity(part, decimalMark);
    }
    costValue = {
      kind: totalCost ? "total" : "per-unit",
      amount: costAmount,
      ...(date === undefined ? {} : { date }),
      ...(label === undefined ? {} : { label }),
    };
    rest = (rest.slice(0, costMatch.index) + rest.slice(costMatch.index + costMatch[0].length)).trim();
  }
  const totalPriceAt = rest.lastIndexOf("@@");
  const unitPriceAt = totalPriceAt < 0 ? rest.lastIndexOf("@") : -1;
  const priceAt = totalPriceAt >= 0 ? totalPriceAt : unitPriceAt;
  if (priceAt >= 0) {
    const priceAmount = quantity(rest.slice(priceAt + (totalPriceAt >= 0 ? 2 : 1)), decimalMark);
    if (priceAmount) priceValue = { kind: totalPriceAt >= 0 ? "@@" : "@", amount: priceAmount };
    rest = rest.slice(0, priceAt).trim();
  }
  return { amount: quantity(rest, decimalMark), cost: costValue, price: priceValue };
}

function postingOf(content, decimalMark) {
  const split = /\t| {2,}/.exec(content.trim());
  let account = split ? content.trim().slice(0, split.index).trim() : content.trim();
  let expression = split ? content.trim().slice(split.index + split[0].length).trim() : "";
  if (!account) return null;
  const meta = {};
  if ((account.startsWith("(") && account.endsWith(")")) || (account.startsWith("[") && account.endsWith("]"))) {
    meta["virtual"] = account[0];
    account = account.slice(1, -1).trim();
  }
  let balanceAssertion = null;
  const assertion = /(.*?)\s+(==|=)\s+(.+)$/.exec(expression);
  if (assertion) {
    expression = assertion[1]?.trim() ?? "";
    const asserted = amountExpression(assertion[3] ?? "", decimalMark).amount;
    if (asserted) balanceAssertion = assertion[2] === "==" ? { amount: asserted, sole: true } : { amount: asserted };
  }
  const parsed = expression ? amountExpression(expression, decimalMark) : { amount: null, cost: null, price: null };
  return posting({ account, amount: parsed.amount, cost: parsed.cost, price: parsed.price, balanceAssertion, meta });
}

const DATE = /^(\d{4})([-/.])(\d{2})\2(\d{2})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s*/;

function dated(content) {
  const match = DATE.exec(content);
  if (!match) return null;
  const month = Number(match[3]);
  const day = Number(match[4]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    date: `${match[1]}-${match[3]}-${match[4]}`,
    time: match[5] ?? null,
    rest: content.slice(match[0].length).trim(),
  };
}

function quoted(content) {
  return [...content.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1] ?? "");
}

function metadataOf(lines) {
  const meta = {};
  for (const line of lines) {
    const metadata = /^([a-z][\w-]*):\s+(.+)$/.exec(line.content);
    if (metadata) {
      const value = metadata[2] ?? "";
      if (value.startsWith("\"") && value.endsWith("\"")) {
        try { meta[metadata[1] ?? ""] = JSON.parse(value); } catch { meta[metadata[1] ?? ""] = value.slice(1, -1); }
      } else meta[metadata[1] ?? ""] = value;
    }
  }
  return meta;
}

function parseBeancount(text, source, decimalMark) {
  const entries = [];
  for (const block of blocksOf(linesOf(text))) {
    const content = block.header.content;
    const location = { file: source, line: block.header.number };
    const hold = (reason) => { entries.push(malformed({ raw: block.header.raw, reason, source: location })); };
    if (content.startsWith("option")) {
      const values = quoted(content);
      entries.push(option({ key: values[0] ?? null, value: values[1] ?? null, source: location }));
      continue;
    }
    if (content.startsWith("include")) {
      entries.push(include({ path: quoted(content)[0] ?? null, source: location }));
      continue;
    }
    if (content.startsWith("plugin") || content.startsWith("poption")) continue;
    const date = dated(content);
    if (!date) {
      hold("non-directive");
      continue;
    }
    const tokens = date.rest.split(/\s+/).filter(Boolean);
    const keyword = tokens[0] ?? "";
    if (keyword === "open") {
      const account = tokens[1];
      if (!account) hold("open-missing-account");
      else {
        const booking = quoted(date.rest)[0] ?? null;
        const commodityText = tokens.slice(2).filter((token) => !token.startsWith('"')).join("");
        entries.push(open({
          date: date.date,
          account,
          commodities: commodityText.split(",").filter(Boolean),
          booking,
          source: location,
        }));
      }
      continue;
    }
    if (keyword === "close") {
      const account = tokens[1];
      if (!account) hold("close-missing-account");
      else entries.push(close({ date: date.date, account, source: location }));
      continue;
    }
    if (keyword === "commodity") {
      const symbol = tokens[1];
      if (!symbol) hold("commodity-missing-symbol");
      else entries.push(commodity({ date: date.date, symbol, precision: null, source: location }));
      continue;
    }
    if (keyword === "pad") {
      if (!tokens[1] || !tokens[2]) hold("pad-missing-account");
      else entries.push(pad({ date: date.date, account: tokens[1], padAccount: tokens[2], source: location }));
      continue;
    }
    if (keyword === "balance") {
      const balanceTokens = tokens.slice(2);
      const tilde = balanceTokens.indexOf("~");
      const amountText = tilde < 0
        ? balanceTokens.join(" ")
        : `${balanceTokens.slice(0, tilde).join(" ")} ${balanceTokens.at(-1) ?? ""}`;
      const amount = amountExpression(amountText, decimalMark).amount;
      const tolerance = tilde < 0 ? null : balanceTokens[tilde + 1] ?? null;
      if (!tokens[1] || !amount) hold("balance-unparseable");
      else entries.push(balance({ date: date.date, account: tokens[1], amount, tolerance, meta: metadataOf(block.body), source: location }));
      continue;
    }
    if (keyword === "price") {
      const amount = amountExpression(tokens.slice(2).join(" "), decimalMark).amount;
      if (!tokens[1] || !amount) hold("price-unparseable");
      else entries.push(price({ date: date.date, commodity: tokens[1], amount, source: location }));
      continue;
    }
    if (keyword === "note") {
      const account = tokens[1];
      const comment = quoted(date.rest)[0];
      if (!account || comment === undefined) hold("note-unparseable");
      else entries.push(note({ date: date.date, account, comment, meta: metadataOf(block.body), source: location }));
      continue;
    }
    if (keyword === "event") {
      const values = quoted(date.rest);
      if (values.length < 2) hold("event-unparseable");
      else entries.push(event({ date: date.date, type: values[0] ?? "", description: values[1] ?? "", meta: metadataOf(block.body), source: location }));
      continue;
    }
    if (["document", "query", "custom", "pushtag", "poptag"].includes(keyword)) {
      hold(`unsupported-directive: ${keyword}`);
      continue;
    }
    const strings = quoted(date.rest);
    const flag = ["*", "!", "txn", "P", "&", "#", "%", "?"].includes(keyword) ? (keyword === "txn" ? "*" : keyword) : null;
    if (!flag && strings.length === 0) {
      hold(`unknown-keyword: ${keyword}`);
      continue;
    }
    const meta = metadataOf(block.body);
    const postings = [];
    for (const line of block.body) {
      if (/^([a-z][\w-]*):\s+(.+)$/.test(line.content)) continue;
      const parsedPosting = postingOf(line.content, decimalMark);
      if (parsedPosting) postings.push(parsedPosting);
    }
    entries.push(transaction({
      date: date.date,
      time: date.time,
      flag,
      payee: strings.length >= 2 ? strings[0] ?? null : null,
      narration: strings.length >= 2 ? strings[1] ?? "" : strings[0] ?? "",
      postings,
      meta,
      source: location,
    }));
  }
  return { entries };
}

function parseHledger(text, source, decimalMark) {
  const entries = [];
  for (const block of blocksOf(linesOf(text))) {
    const content = block.header.content;
    const location = { file: source, line: block.header.number };
    if (["#", "%", "|", "*"].includes(content[0] ?? "")) continue;
    const date = dated(content);
    if (!date) {
      const [keyword] = content.split(/\s+/);
      if (keyword === "account") entries.push(open({ date: null, account: content.slice(7).trim(), commodities: [], source: location }));
      else if (keyword === "include") entries.push(include({ path: content.slice(7).trim() || null, source: location }));
      else entries.push(malformed({ raw: block.header.raw, reason: "non-directive", source: location }));
      continue;
    }
    let rest = date.rest;
    const flag = rest.startsWith("*") || rest.startsWith("!") ? rest[0] ?? null : null;
    if (flag) rest = rest.slice(1).trim();
    const separator = rest.indexOf(" | ");
    const payee = separator >= 0 ? rest.slice(0, separator).trim() : null;
    const narration = separator >= 0 ? rest.slice(separator + 3).trim() : rest;
    const postings = block.body.map((line) => postingOf(line.content, decimalMark)).filter((value) => value !== null);
    entries.push(transaction({ date: date.date, time: date.time, flag, payee, narration, postings, source: location }));
  }
  return { entries };
}

export function detectJournalFormat({ path = "", text = "" } = {}) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".beancount")) return "beancount";
  if (lower.endsWith(".ledger") || lower.endsWith(".journal") || lower.endsWith(".hledger") || lower.endsWith(".dat")) return "hledger";
  if (/^\s*option\s+"/m.test(text) || /^\d{4}-\d{2}-\d{2}\s+(open|close|commodity|balance|pad|price|txn|\*|!)\b/m.test(text)) return "beancount";
  return "hledger";
}

export function parseJournalText(text, options = {}) {
  const format = options.format ?? detectJournalFormat({ text });
  const source = options.source ?? null;
  const decimalMark = options.decimalMark ?? ".";
  return format === "beancount" ? parseBeancount(text, source, decimalMark) : parseHledger(text, source, decimalMark);
}

const INCLUDE_GLOB_PATTERN = /[*?[\]{}]/u;

export function parseJournalFile(path, options = {}) {
  const root = resolve(path);
  const seen = new Set();
  const load = (file) => {
    if (seen.has(file)) return [{ ...include({ path: file }), resolved: false, error: "include-cycle" }];
    seen.add(file);
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch (error) {
      const code = (error).code ?? "error";
      return [malformed({ raw: file, reason: `unreadable: ${code}` })];
    }
    const parsed = parseJournalText(text, { format: detectJournalFormat({ path: file, text }), source: file, decimalMark: options.decimalMark ?? "." });
    const out = [];
    for (const entry of parsed.entries) {
      if ("directive" in entry && entry.directive === "include" && entry.path) {
        if (INCLUDE_GLOB_PATTERN.test(entry.path)) {
          const matches = [...globSync(entry.path, { cwd: dirname(file) })].sort();
          if (matches.length === 0) {
            out.push({ ...entry, resolved: false, error: "glob-no-match" });
            out.push(malformed({ raw: entry.path, reason: "glob-no-match", source: entry.source }));
            continue;
          }
          for (const match of matches) {
            const child = resolve(dirname(file), match);
            if (seen.has(child)) out.push({ ...entry, path: match, resolved: false, error: "include-cycle" });
            else {
              out.push({ ...entry, path: match, resolved: true, error: null });
              out.push(...load(child));
            }
          }
          continue;
        }
        const child = resolve(dirname(file), entry.path);
        if (seen.has(child)) out.push({ ...entry, resolved: false, error: "include-cycle" });
        else {
          out.push({ ...entry, resolved: true, error: null });
          out.push(...load(child));
        }
      } else out.push(entry);
    }
    return out;
  };
  return { entries: load(root) };
}
