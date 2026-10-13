/** Native MUD operation input: complete JSON values or typed key=value words.
 * World and Metroplex use this same reader before native operation admission. */
export function readPowerInput(argument, schema = {}) {
  const text = String(argument ?? "").trim();
  if (text === "") return {};
  if (/^(?:[\[{"]|true$|false$|null$|-?\d)/u.test(text)) return JSON.parse(text);
  const input = {};
  for (const match of text.matchAll(/([A-Za-z][\w.-]*)=(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))|(\S+)/gu)) {
    const [, key, doubled, single, bare, stray] = match;
    if (stray !== undefined) throw new SyntaxError(`"${stray}" is not key=value`);
    const path = key.split(".");
    let target = input;
    for (const part of path.slice(0, -1)) target = target[part] = target[part] && typeof target[part] === "object" ? target[part] : {};
    const field = path.at(-1);
    if (doubled !== undefined || single !== undefined) { target[field] = (doubled ?? single).replace(/\\(.)/gu, "$1"); continue; }
    if (/^[[{]/u.test(bare)) {
      try { target[field] = JSON.parse(bare); continue; } catch { /* words, as any other */ }
    }
    const declared = path.length === 1 ? schema.properties?.[key] : undefined;
    const textOnly = declared !== undefined && (declared.type === "string" || (declared.enum ?? []).every((v) => typeof v === "string") && declared.enum !== undefined);
    const scalar = (word) => (textOnly ? word : word === "true" ? true : word === "false" ? false : /^-?\d+(\.\d+)?$/u.test(word) ? Number(word) : word);
    target[field] = bare.includes(",") ? bare.split(",").filter(Boolean).map(scalar) : scalar(bare);
  }
  return input;
}
