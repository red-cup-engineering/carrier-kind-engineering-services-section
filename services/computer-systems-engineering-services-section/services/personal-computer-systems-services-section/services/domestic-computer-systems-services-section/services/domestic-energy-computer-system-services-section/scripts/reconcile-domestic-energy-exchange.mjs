#!/usr/bin/env node

const DECIMAL = /^-?[0-9]+(?:\.[0-9]+)?$/u;

function decimalScale(text) {
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function decimalToBigInt(text, scale) {
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [integer, fraction = ""] = unsigned.split(".");
  const value = BigInt(`${integer}${(fraction + "0".repeat(scale)).slice(0, scale)}`);
  return negative ? -value : value;
}

function decimalDifference(left, right) {
  const scale = Math.max(decimalScale(left), decimalScale(right));
  const difference = decimalToBigInt(left, scale) - decimalToBigInt(right, scale);
  const absolute = difference < 0n ? -difference : difference;
  const digits = absolute.toString().padStart(scale + 1, "0");
  const integer = digits.slice(0, digits.length - scale) || "0";
  const fraction = scale === 0 ? "" : digits.slice(-scale).replace(/0+$/u, "");
  return fraction === "" ? integer : `${integer}.${fraction}`;
}

function isNoMoreThan(left, right) {
  const scale = Math.max(decimalScale(left), decimalScale(right));
  return decimalToBigInt(left, scale) <= decimalToBigInt(right, scale);
}

function requireReading(reading) {
  if (reading === null || typeof reading !== "object" || Array.isArray(reading)) throw new TypeError("each reading must be an object");
  if (typeof reading.source !== "string" || reading.source.length === 0) throw new TypeError("each reading needs a source");
  if (typeof reading.amount !== "string" || !DECIMAL.test(reading.amount)) throw new TypeError("each reading amount must be a decimal string");
  if (typeof reading.observedAt !== "string" || reading.observedAt.length === 0) throw new TypeError("each reading needs an observedAt timestamp");
}

/**
 * Reconciles the first two independent readings for one household energy delivery.
 * @param {{exchange: object, tolerance?: string}} request Energy delivery and readings.
 * @returns {object} The delivery with its reconciliation result.
 */
export function reconcileDomesticEnergyExchange(request) {
  const exchange = request?.exchange;
  if (exchange === null || typeof exchange !== "object" || Array.isArray(exchange)) throw new TypeError("exchange is required");
  if (Object.hasOwn(exchange, "reconciliation")) throw new TypeError("exchange already has a reconciliation");
  if (!Array.isArray(exchange.readings) || exchange.readings.length < 2) throw new TypeError("exchange needs at least two readings");

  const tolerance = request.tolerance ?? "0";
  if (typeof tolerance !== "string" || !DECIMAL.test(tolerance) || tolerance.startsWith("-")) throw new TypeError("tolerance must be a non-negative decimal string");

  const firstReadingBySource = new Map();
  for (const reading of exchange.readings) {
    requireReading(reading);
    if (!firstReadingBySource.has(reading.source)) firstReadingBySource.set(reading.source, reading);
  }

  const independentReadings = [...firstReadingBySource.values()];
  if (independentReadings.length < 2) {
    return {
      ...exchange,
      reconciliation: { status: "awaiting-independent-reading", difference: null, confirmedAt: null },
    };
  }

  const [first, second] = independentReadings;
  const difference = decimalDifference(first.amount, second.amount);
  if (isNoMoreThan(difference, tolerance)) {
    return {
      ...exchange,
      reconciliation: {
        status: "confirmed",
        difference: null,
        confirmedAt: first.observedAt > second.observedAt ? first.observedAt : second.observedAt,
      },
    };
  }

  return {
    ...exchange,
    reconciliation: { status: "disputed", difference, confirmedAt: null },
  };
}

if (import.meta.main) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  for (const line of input.split("\n")) {
    if (line.length > 0) process.stdout.write(`${JSON.stringify(reconcileDomesticEnergyExchange(JSON.parse(line)))}\n`);
  }
}
