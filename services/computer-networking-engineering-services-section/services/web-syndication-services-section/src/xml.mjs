/**
 * xml -- a small, strict reader for the well-formed XML feeds are written in. It builds an element tree
 * `{ name, attrs, children, text }` (names keep their prefix), decodes the predefined and numeric
 * character references and CDATA, and refuses what a feed never needs: a DOCTYPE with an internal
 * subset or any custom entity (no external or recursive expansion can happen), and malformed nesting.
 */
const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/gu, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isInteger(code) || code < 1 || code > 0x10ffff) throw new SyntaxError(`bad character reference ${whole}`);
      return String.fromCodePoint(code);
    }
    if (!Object.hasOwn(ENTITY, body)) throw new SyntaxError(`undeclared entity ${whole}`);
    return ENTITY[body];
  });
}

function parseAttributes(text) {
  const attrs = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;
  let consumed = 0;
  for (const m of text.matchAll(pattern)) {
    if (Object.hasOwn(attrs, m[1])) throw new SyntaxError(`duplicate attribute ${m[1]}`);
    attrs[m[1]] = decode(m[2] ?? m[3]);
    consumed += m[0].length;
  }
  if (text.replace(pattern, "").trim() !== "") throw new SyntaxError("malformed attributes");
  void consumed;
  return attrs;
}

/** Parse an XML document into its root element. */
export function parseXml(source) {
  if (typeof source !== "string") throw new TypeError("parseXml expects a string");
  let text = source.replace(/^﻿/u, "");
  text = text.replace(/^\s*<\?xml[^>]*\?>/u, "");
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  let i = 0;
  const top = () => stack.at(-1);
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt === -1) { top().children.push(decode(text.slice(i))); break; }
    if (lt > i) top().children.push(decode(text.slice(i, lt)));
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      if (end === -1) throw new SyntaxError("unterminated comment");
      i = end + 3;
    } else if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      if (end === -1) throw new SyntaxError("unterminated CDATA");
      top().children.push(text.slice(lt + 9, end));
      i = end + 3;
    } else if (text.startsWith("<!DOCTYPE", lt) || text.startsWith("<!doctype", lt)) {
      const head = /^<!DOCTYPE[^>[]*(\[|>)/iu.exec(text.slice(lt));
      if (head === null || head[1] === "[") throw new SyntaxError("a DOCTYPE with an internal subset is refused");
      i = lt + head[0].length;
    } else if (text.startsWith("<?", lt)) {
      const end = text.indexOf("?>", lt);
      if (end === -1) throw new SyntaxError("unterminated processing instruction");
      i = end + 2;
    } else if (text.startsWith("</", lt)) {
      const end = text.indexOf(">", lt);
      if (end === -1) throw new SyntaxError("unterminated end tag");
      const name = text.slice(lt + 2, end).trim();
      const open = stack.pop();
      if (open === undefined || open === root || open.name !== name) throw new SyntaxError(`mismatched end tag </${name}>`);
      i = end + 1;
    } else {
      const m = /^<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/u.exec(text.slice(lt));
      if (m === null) throw new SyntaxError("malformed start tag");
      const element = { name: m[1], attrs: parseAttributes(m[2]), children: [], text: "" };
      top().children.push(element);
      if (m[3] !== "/") stack.push(element);
      i = lt + m[0].length;
    }
  }
  if (stack.length !== 1) throw new SyntaxError(`unclosed element <${top().name}>`);
  const rootElement = root.children.find((c) => typeof c !== "string");
  if (rootElement === undefined) throw new SyntaxError("no root element");
  const finish = (element) => {
    element.text = element.children.filter((c) => typeof c === "string").join("");
    for (const child of element.children) if (typeof child !== "string") finish(child);
  };
  finish(rootElement);
  return rootElement;
}

/** The child elements of `element`, optionally of one name. */
export const childrenOf = (element, name) => element.children.filter((c) => typeof c !== "string" && (name === undefined || c.name === name));
/** The first child element of that name. */
export const childOf = (element, name) => childrenOf(element, name)[0];
