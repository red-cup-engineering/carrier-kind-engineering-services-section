function fail(message) { throw new TypeError(message); }

export const IAC = 255, DONT = 254, DO = 253, WONT = 252, WILL = 251, SB = 250, SE = 240;
export const COMPRESS2 = 86;  // MCCP2 — declined (see header)
export const MXP = 91;        // MUD eXtension Protocol — OFFERED (line-tagging only)
export const GMCP = 201;      // Generic Mud Communication Protocol — OFFERED
export const MSDP = 69;       // Mud Server Data Protocol — OFFERED
export const ECHO = 1, SGA = 3, EOR = 25, TTYPE = 24, NAWS = 31, CHARSET = 42; // SGA OFFERED; rest declined
// MSDP payload framing bytes (same values as tab-wire.mjs's, adapted from legacy tab — see header).
export const MSDP_VAR = 1, MSDP_VAL = 2, MSDP_TABLE_OPEN = 3, MSDP_TABLE_CLOSE = 4, MSDP_ARRAY_OPEN = 5, MSDP_ARRAY_CLOSE = 6;

const enc = new TextEncoder();
const dec = new TextDecoder("utf8");

// bytesOf — UTF-8 bytes of a string as a Buffer. The single text→wire conversion point.
export function bytesOf(text) {
  return Buffer.from(enc.encode(String(text)));
}

// TELNET_ASCII_PUNCTUATION — typographic Unicode punctuation this module renders down to its
// bare-ASCII equivalent before it reaches send/sendLine's UTF-8 encoding: a bare latin1 telnet
// client (no UTF-8 decoding) shows the raw multi-byte sequence of any of these as mojibake
// (measured live 2026-08-31 against say/chat output containing curly quotes).
const TELNET_ASCII_PUNCTUATION = new Map([
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["‛", "'"],
  ["“", '"'], ["”", '"'], ["„", '"'], ["‟", '"'],
  ["–", "-"], ["—", "--"],
  ["…", "..."],
]);

// transliterateForTelnet — replace each typographic-punctuation code point above with its ASCII
// equivalent; every other character (including any other non-ASCII text) passes through
// unchanged. Applied only at the telnet wire's render point (send/sendLine below), never upstream
// in engine/world text.
export function transliterateForTelnet(text) {
  let out = String(text);
  for (const [from, to] of TELNET_ASCII_PUNCTUATION) out = out.split(from).join(to);
  return out;
}

// escapeIAC — double any literal IAC (255) byte in a data buffer, so it is never misread as the
// start of a command. The state machine below reverses this (IAC IAC → one 255) on input.
export function escapeIAC(buffer) {
  const out = [];
  for (const byte of buffer) { if (byte === IAC) out.push(IAC); out.push(byte); }
  return Buffer.from(out);
}

// encodeMSDP — serialize a JS value into MSDP payload bytes (without the surrounding IAC SB/SE).
// A top-level object is a sequence of VAR<name>VAL<value>; arrays/objects nest via ARRAY/TABLE.
// Adapted from legacy tab's scripts/telnet.mjs (see header) — unchanged byte logic.
export function encodeMSDP(obj) {
  const out = [];
  const pushStr = (s) => { for (const b of bytesOf(s)) out.push(b); };
  const pushVal = (v) => {
    if (Array.isArray(v)) {
      out.push(MSDP_ARRAY_OPEN);
      for (const item of v) { out.push(MSDP_VAL); pushVal(item); }
      out.push(MSDP_ARRAY_CLOSE);
    } else if (v && typeof v === "object") {
      out.push(MSDP_TABLE_OPEN);
      for (const [k, val] of Object.entries(v)) { out.push(MSDP_VAR); pushStr(k); out.push(MSDP_VAL); pushVal(val); }
      out.push(MSDP_TABLE_CLOSE);
    } else {
      pushStr(v == null ? "" : String(v));
    }
  };
  for (const [k, v] of Object.entries(obj ?? {})) { out.push(MSDP_VAR); pushStr(k); out.push(MSDP_VAL); pushVal(v); }
  return Buffer.from(out);
}

// parseMSDP — the inverse: MSDP payload bytes → a JS object (top-level VAR/VAL pairs; nested
// TABLE→object, ARRAY→array). Best-effort; malformed input yields whatever parsed cleanly.
// Adapted from legacy tab's scripts/telnet.mjs (see header) — unchanged byte logic.
export function parseMSDP(bytes) {
  const buf = Buffer.from(bytes);
  let i = 0;
  function readScalarOrStructured() {
    if (buf[i] === MSDP_TABLE_OPEN) { i++; return readTable(); }
    if (buf[i] === MSDP_ARRAY_OPEN) { i++; return readArray(); }
    return readString();
  }
  function readString() {
    const start = i;
    while (i < buf.length && buf[i] !== MSDP_VAR && buf[i] !== MSDP_VAL &&
           buf[i] !== MSDP_TABLE_OPEN && buf[i] !== MSDP_TABLE_CLOSE &&
           buf[i] !== MSDP_ARRAY_OPEN && buf[i] !== MSDP_ARRAY_CLOSE) i++;
    return dec.decode(buf.subarray(start, i));
  }
  function readTable() {
    const obj = {};
    while (i < buf.length && buf[i] !== MSDP_TABLE_CLOSE) {
      if (buf[i] === MSDP_VAR) { i++; const k = readString(); if (buf[i] === MSDP_VAL) i++; obj[k] = readScalarOrStructured(); }
      else i++;
    }
    if (buf[i] === MSDP_TABLE_CLOSE) i++;
    return obj;
  }
  function readArray() {
    const arr = [];
    while (i < buf.length && buf[i] !== MSDP_ARRAY_CLOSE) {
      if (buf[i] === MSDP_VAL) { i++; arr.push(readScalarOrStructured()); }
      else i++;
    }
    if (buf[i] === MSDP_ARRAY_CLOSE) i++;
    return arr;
  }
  return readTable.call(null) ?? {};
}

// serverTelnet — the SERVER-perspective telnet + GMCP/MSDP/MXP wire codec for one connection.
// Pure over its fed bytes: the same input produces the same lines/dispatches every time.
// `opts.write` is the only required option: the byte sink (a socket write, or a test collector).
export function serverTelnet(opts = {}) {
  if (typeof opts.write !== "function") fail("serverTelnet requires a write(bytes) sink");
  const maxLineBytes = opts.maxLineBytes ?? 4096;
  if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1) fail("serverTelnet maxLineBytes must be a positive integer");
  if (opts.onInputError !== undefined && typeof opts.onInputError !== "function") fail("serverTelnet onInputError must be a function");
  const onInputError = opts.onInputError ?? (() => {});
  const write = opts.write;

  // negotiated-state — the live, public view a caller consults (see header: intentionally not
  // frozen, unlike every other return value in this module).
  const supports = { gmcp: false, msdp: false, mxp: false, sga: false };

  // --- low-level wire emitters ----------------------------------------------------------------
  const cmd = (verb, option) => write(Buffer.from([IAC, verb, option]));
  function sub(option, payload) {
    const body = Buffer.isBuffer(payload) ? payload : bytesOf(payload ?? "");
    write(Buffer.concat([Buffer.from([IAC, SB, option]), escapeIAC(body), Buffer.from([IAC, SE])]));
  }

  // --- handler registries ---------------------------------------------------------------------
  const lineHandlers = new Set();
  const gmcpHandlers = new Set();
  const msdpHandlers = new Set();
  const negotiateHandlers = new Set();
  const emitNegotiate = () => { for (const cb of negotiateHandlers) { try { cb({ ...supports }); } catch { /* a bad handler must not stall the wire */ } } };

  // --- INPUT state machine (mirrors tab's/wheatstone's shape exactly) -------------------------
  let lineBuf = [];
  let lineTooLong = false;
  let state = "data"; // data | iac | verb | sb-opt | sb | sbiac
  let verb = 0;
  let sbOption = 0;
  let sbBuf = [];

  function pushLineByte(byte) {
    if (lineTooLong) return;
    if (lineBuf.length >= maxLineBytes) { lineBuf = []; lineTooLong = true; }
    else lineBuf.push(byte);
  }

  function flushLine() {
    if (lineTooLong) {
      lineBuf = [];
      lineTooLong = false;
      try { onInputError(new RangeError(`telnet line exceeds ${maxLineBytes} bytes`)); } catch { /* a bad reporter must not stall input */ }
      return;
    }
    const line = dec.decode(Buffer.from(lineBuf));
    lineBuf = [];
    for (const cb of lineHandlers) { try { cb(line); } catch { /* a bad handler must not stall input */ } }
  }

  // a client's WILL <option> offers to drive it TO us. We consume nothing a client offers in
  // this cut (no TTYPE/NAWS/CHARSET handling implemented) — every offer is gracefully declined.
  // This is unrelated to us OFFERING WILL GMCP/MSDP/MXP/SGA ourselves (see onDo): a client
  // WILLing one of those options the wrong way round (asking to drive something only the server
  // drives) is still refused.
  function onWill(option) { cmd(DONT, option); }
  function onWont(_option) { /* client refuses to drive something we never asked it to; no-op */ }
  // a client's DO <option> answers our own WILL (or is an unprompted request that we drive it).
  // We accept only the four we offered; everything else is a graceful WONT, never silence.
  function onDo(option) {
    if (option === GMCP) { supports.gmcp = true; emitNegotiate(); return; }
    if (option === MSDP) { supports.msdp = true; emitNegotiate(); return; }
    if (option === MXP) { supports.mxp = true; emitNegotiate(); return; }
    if (option === SGA) { supports.sga = true; emitNegotiate(); return; }
    cmd(WONT, option);
  }
  function onDont(option) {
    if (option === GMCP) { supports.gmcp = false; emitNegotiate(); }
    else if (option === MSDP) { supports.msdp = false; emitNegotiate(); }
    else if (option === MXP) { supports.mxp = false; emitNegotiate(); }
    else if (option === SGA) { supports.sga = false; emitNegotiate(); }
  }

  // dispatch a completed SB block. GMCP and MSDP are implemented (see header); any other option's
  // SB block (from a misbehaving or optimistic client) is captured by the state machine but
  // ignored.
  function dispatchSB(option, payload) {
    if (option === GMCP) {
      const text = dec.decode(Buffer.from(payload));
      const sp = text.indexOf(" ");
      const pkg = sp === -1 ? text : text.slice(0, sp);
      const json = sp === -1 ? "" : text.slice(sp + 1);
      let data = null;
      if (json.trim().length > 0) { try { data = JSON.parse(json); } catch { data = json; } }
      for (const cb of gmcpHandlers) { try { cb(pkg, data); } catch { /* */ } }
      return;
    }
    if (option === MSDP) {
      const request = parseMSDP(payload);
      for (const cb of msdpHandlers) { try { cb(request); } catch { /* */ } }
      return;
    }
  }

  // feed — push raw client bytes through the state machine. Pure: same bytes → same dispatches.
  function feed(chunk) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      switch (state) {
        case "data":
          if (b === IAC) state = "iac";
          else if (b === 13) { /* CR: defer — LF (or lone CR) ends the line */ }
          else if (b === 10) flushLine();
          else pushLineByte(b);
          break;
        case "iac":
          if (b === IAC) { pushLineByte(IAC); state = "data"; }                    // IAC IAC → literal 255
          else if (b === WILL || b === WONT || b === DO || b === DONT) { verb = b; state = "verb"; }
          else if (b === SB) state = "sb-opt";
          else state = "data";                                                     // GA/EOR/NOP/etc: strip
          break;
        case "verb": {
          const option = b;
          if (verb === WILL) onWill(option);
          else if (verb === WONT) onWont(option);
          else if (verb === DO) onDo(option);
          else if (verb === DONT) onDont(option);
          state = "data";
          break;
        }
        case "sb-opt": sbOption = b; sbBuf = []; state = "sb"; break;
        case "sb":
          if (b === IAC) state = "sbiac";
          else sbBuf.push(b);
          break;
        case "sbiac":
          if (b === IAC) { sbBuf.push(IAC); state = "sb"; }                        // escaped 255 inside SB
          else if (b === SE) { dispatchSB(sbOption, sbBuf); sbBuf = []; state = "data"; }
          else state = "data";                                                     // malformed: bail
          break;
      }
    }
  }

  // --- negotiate (the initial offer) ----------------------------------------------------------
  function negotiate() {
    cmd(WILL, GMCP);
    cmd(WILL, MSDP);
    cmd(WILL, MXP);
    cmd(WILL, SGA);
  }

  // --- OUTPUT ----------------------------------------------------------------------------------
  function send(text) {
    const normalized = transliterateForTelnet(text).replace(/\r?\n/g, "\r\n");
    write(escapeIAC(bytesOf(normalized)));
  }
  function sendLine(text) {
    const normalized = transliterateForTelnet(text).replace(/\r?\n/g, "\r\n");
    write(escapeIAC(bytesOf(`${normalized}\r\n`)));
  }
  function sendGMCP(pkg, data) {
    if (!supports.gmcp) return;
    const body = data === undefined ? String(pkg) : `${pkg} ${JSON.stringify(data)}`;
    sub(GMCP, body);
  }
  function sendMSDP(obj) {
    if (!supports.msdp) return;
    sub(MSDP, encodeMSDP(obj));
  }

  // --- MXP line-tagging (protocol-level only: no FeltOS vocabulary here, see mxpRoomLine below
  // for what actually gets tagged) -------------------------------------------------------------
  // Adapted from legacy tab's scripts/telnet.mjs `mxp` helpers (see header) — unchanged escape
  // logic. Every helper degrades to plain text (or "") when the client never answered DO MXP, so
  // a caller can build one line unconditionally and let it render correctly either way.
  const ESC = "\x1b";
  const mxp = {
    // tag — a raw MXP tag in the current (open) line mode; plain "" when MXP is off. For tags
    // that need no client trust (e.g. <b>/</b>): open mode is the honest minimum, not secure mode.
    tag(t) { return supports.mxp ? t : ""; },
    // secureTag — emit one tag in MXP "secure" line mode (ESC[1z), which the client always
    // trusts, then immediately close it (ESC[7z) so nothing that follows is misread as secure.
    secureTag(t) { return supports.mxp ? `${ESC}[1z${t}${ESC}[7z` : ""; },
    // link — a clickable <send> that runs `command` when clicked, showing `text`. Plain text
    // (just the label) when MXP is off, so the line still reads correctly either way.
    link(text, command) {
      if (!supports.mxp) return String(text);
      const escaped = String(command).replace(/"/g, "&quot;");
      return `${ESC}[1z<send "${escaped}">${ESC}[7z${text}${ESC}[1z</send>${ESC}[7z`;
    },
  };

  // --- public surface -------------------------------------------------------------------------
  function onLine(cb) { lineHandlers.add(cb); return () => lineHandlers.delete(cb); }
  function onGMCP(cb) { gmcpHandlers.add(cb); return () => gmcpHandlers.delete(cb); }
  function onMSDP(cb) { msdpHandlers.add(cb); return () => msdpHandlers.delete(cb); }
  function onNegotiate(cb) { negotiateHandlers.add(cb); return () => negotiateHandlers.delete(cb); }

  return { negotiate, feed, onLine, onGMCP, onMSDP, onNegotiate, send, sendLine, sendGMCP, sendMSDP, mxp, supports };
}

