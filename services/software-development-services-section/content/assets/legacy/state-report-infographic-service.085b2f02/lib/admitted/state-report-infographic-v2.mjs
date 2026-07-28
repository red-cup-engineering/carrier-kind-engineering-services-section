#!/usr/bin/env node

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)).digest("hex");
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function normalize(packet) {
  if (packet?.type !== "HarmoniousUnionDeltaPacket") throw new Error("packet must be a HarmoniousUnionDeltaPacket");
  if (typeof packet.period !== "string" || packet.period.length === 0) throw new Error("packet period is required");
  if (!Array.isArray(packet.claims) || packet.claims.length === 0) throw new Error("packet claims must be non-empty");
  const claims = packet.claims.map((claim) => {
    if (typeof claim?.settlement !== "string" || typeof claim?.label !== "string") throw new Error("each claim requires settlement and label");
    if (!["held", "denied", "unknown", "both"].includes(claim.state)) throw new Error("claim state must be held, denied, unknown, or both");
    return { settlement: claim.settlement, label: claim.label, state: claim.state };
  }).sort((left, right) => canonical(left).localeCompare(canonical(right)));
  return { type: packet.type, period: packet.period, claims };
}

const COLORS = { held: "#000000", denied: "#000000", unknown: "#000000", both: "#000000" };
const RGB = { held: [0, 0, 0], denied: [0, 0, 0], unknown: [0, 0, 0], both: [0, 0, 0] };

function countsFor(claims) {
  return Object.fromEntries(Object.keys(COLORS).map((state) => [state, claims.filter((claim) => claim.state === state).length]));
}

export function renderSvg(packet) {
  const value = normalize(packet); const counts = countsFor(value.claims); const total = value.claims.length;
  const bars = Object.entries(counts).map(([state, count], index) => {
    const width = Math.round((count / total) * 556);
    return `<g transform="translate(80 ${190 + index * 62})"><text x="0" y="22" fill="#000000" font-family="monospace" font-size="18">${state.toUpperCase()}</text><rect x="120" y="0" width="560" height="28" rx="7" fill="#000000"/><rect x="122" y="2" width="556" height="24" rx="5" fill="#ffffff"/><rect x="122" y="2" width="${width}" height="24" rx="5" fill="${COLORS[state]}"/><text x="700" y="22" fill="#000000" font-family="monospace" font-size="18">${count}</text></g>`;
  }).join("");
  const digest = sha256(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny" width="840" height="500" viewBox="0 0 840 500"><title>State of the Harmonious Union delta</title><desc>Counts of constituent-local claims classified as held, denied, unknown, or both. The graphic does not assert global settlement truth.</desc><rect width="840" height="500" fill="#ffffff"/><text x="80" y="72" fill="#000000" font-family="sans-serif" font-size="30" font-weight="bold">STATE OF THE HARMONIOUS UNION</text><text x="80" y="108" fill="#000000" font-family="monospace" font-size="17">DELTA ${escapeXml(value.period)}</text><text x="80" y="145" fill="#000000" font-family="monospace" font-size="14">${value.claims.length} constituent-local claims · ${digest.slice(0, 16)}</text>${bars}<text x="80" y="465" fill="#000000" font-family="monospace" font-size="13">States remain claims; this graphic does not glue settlement truth.</text></svg>`;
}

export function renderPng(packet, svgDigest) {
  const value = normalize(packet); const counts = countsFor(value.claims); const width = 840; const height = 500;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1); pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      let color = [255, 255, 255];
      for (const [index, [state, count]] of Object.entries(counts).entries()) {
        const top = 190 + index * 62; const barWidth = Math.round((count / value.claims.length) * 560);
        if (y >= top && y < top + 28 && x >= 200 && x < 760) color = x < 200 + barWidth ? RGB[state] : [255, 255, 255];
      }
      const offset = row + 1 + x * 4; pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("tEXt", Buffer.from(`packet-sha256\0${sha256(value)}`)), chunk("tEXt", Buffer.from(`svg-sha256\0${svgDigest}`)), chunk("IDAT", deflateSync(pixels, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

export function render(packet) {
  const normalized = normalize(packet); const svg = renderSvg(normalized); const svgDigest = `sha256:${sha256(svg)}`; const png = renderPng(normalized, svgDigest);
  return { type: "DeterministicStateReportInfographic", packetDigest: `sha256:${sha256(normalized)}`, svg, svgProfile: "SVG 1.2 RFC", svgDigest, pngBase64: png.toString("base64"), pngDigest: `sha256:${sha256(png)}`, pngBoundToSvgDigest: svgDigest };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const inputIndex = process.argv.indexOf("--input"); const outputIndex = process.argv.indexOf("--output");
  const packet = JSON.parse(inputIndex >= 0 ? readFileSync(process.argv[inputIndex + 1], "utf8") : readFileSync(0, "utf8"));
  const result = `${JSON.stringify(render(packet))}\n`;
  if (outputIndex >= 0) writeFileSync(process.argv[outputIndex + 1], result, { flag: "wx" }); else process.stdout.write(result);
}
