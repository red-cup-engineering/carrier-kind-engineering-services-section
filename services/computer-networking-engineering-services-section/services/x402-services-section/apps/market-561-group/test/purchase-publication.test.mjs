import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { parseArguments, retryDelayMs, runPurchase, validatePublicationUrl } from "../scripts/purchase-publication.mjs";

const handbookUrl = "https://market.561.group/v1/publications/the-agent-operators-handbook";

test("new purchases require all explicit purchase boundaries and only admitted routes", () => {
  assert.deepEqual(parseArguments([
    "--url", handbookUrl,
    "--max-amount-atomic", "29000000",
    "--output", "book.zip",
    "--recovery-file", "purchase.json",
  ]).maximumAmount, "29000000");
  assert.throws(() => validatePublicationUrl("https://market.561.group/v1/catalog"), /two current publication routes/u);
  assert.throws(() => validatePublicationUrl("http://market.561.group/v1/koios/briefing/current"), /two current publication routes/u);
  assert.throws(() => parseArguments(["--url", handbookUrl]), /missing required/u);
  assert.throws(() => parseArguments([
    "--url", handbookUrl,
    "--max-amount-atomic", "29000000",
    "--output", "purchase.json",
    "--recovery-file", "purchase.json",
  ]), /must be distinct paths/u);
});

test("503 retry delay is bounded instead of retrying early or waiting indefinitely", () => {
  assert.equal(retryDelayMs("3"), 3000);
  assert.equal(retryDelayMs("Wed, 21 Oct 2099 07:28:00 GMT", 0), null);
  assert.equal(retryDelayMs("not-a-date"), 1000);
});

test("resume replays the persisted signed request and recovery token without a signer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-resume-"));
  try {
    const recoveryFile = join(directory, "purchase.json");
    const output = join(directory, "publication.bin");
    const recovery = {
      version: 1,
      method: "GET",
      url: handbookUrl,
      output,
      paymentSignature: "saved-exact-signature-header",
      paymentRecovery: "a".repeat(64),
      createdAt: "2026-09-26T00:00:00.000Z",
    };
    await writeFile(recoveryFile, `${JSON.stringify(recovery)}\n`, { mode: 0o600 });
    const paymentReceipt = encodePaymentResponseHeader({
      success: true,
      network: "eip155:8453",
      transaction: `0x${"1".repeat(64)}`,
      payer: `0x${"2".repeat(40)}`,
    });
    let requests = 0;
    const waits = [];
    const result = await runPurchase({ resume: recoveryFile }, {
      fetchImpl: async (url, init) => {
        requests += 1;
        assert.equal(url, handbookUrl);
        assert.equal(init.headers["payment-signature"], recovery.paymentSignature);
        assert.equal(init.headers["x-payment-recovery"], recovery.paymentRecovery);
        if (requests === 1) return new Response("pending", { status: 503, headers: { "retry-after": "3" } });
        return new Response(Buffer.from([0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/zip", "payment-response": paymentReceipt },
        });
      },
      sleep: async (ms) => { waits.push(ms); },
    });

    assert.equal(requests, 2);
    assert.deepEqual(waits, [3000]);
    assert.equal((await readFile(result.outputPath)).toString("hex"), "504446");
    const receipt = JSON.parse(await readFile(result.receiptPath, "utf8"));
    assert.equal(receipt.paymentResponse.success, true);
    await assert.rejects(readFile(recoveryFile), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a new purchase persists its signed request before the paid request can be sent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-new-"));
  const priorKey = process.env.X402_BUYER_PRIVATE_KEY;
  const recoveryFile = join(directory, "purchase.json");
  const output = join(directory, "publication.bin");
  try {
    process.env.X402_BUYER_PRIVATE_KEY = `0x${randomBytes(32).toString("hex")}`;
    const paymentReceipt = encodePaymentResponseHeader({
      success: true,
      network: "eip155:8453",
      transaction: `0x${"3".repeat(64)}`,
      payer: `0x${"4".repeat(40)}`,
    });
    const challenge = {
      x402Version: 2,
      resource: { url: handbookUrl, description: "Test publication" },
      accepts: [{
        scheme: "exact",
        network: "eip155:8453",
        amount: "29000000",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        payTo: `0x${"5".repeat(40)}`,
        maxTimeoutSeconds: 300,
        extra: { name: "USD Coin", version: "2" },
      }],
    };
    const calls = [];
    const result = await runPurchase({
      url: handbookUrl,
      maximumAmount: "29000000",
      output,
      recoveryFile,
    }, {
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        if (calls.length === 1) return Response.json({}, {
          status: 402,
          headers: { "payment-required": encodePaymentRequiredHeader(challenge) },
        });
        const recoveryStat = await import("node:fs/promises").then(({ stat }) => stat(recoveryFile));
        assert.equal(recoveryStat.mode & 0o777, 0o600);
        const saved = JSON.parse(await readFile(recoveryFile, "utf8"));
        assert.equal(saved.paymentSignature, calls[1].init.headers["payment-signature"]);
        assert.equal(saved.paymentRecovery, calls[1].init.headers["x-payment-recovery"]);
        assert.match(saved.paymentRecovery, /^[0-9a-f]{64}$/u);
        return new Response(Buffer.from("publication"), {
          status: 200,
          headers: { "content-type": "application/zip", "payment-response": paymentReceipt },
        });
      },
      sleep: async () => {},
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[1].init.method, "GET");
    assert.equal((await readFile(result.outputPath)).toString(), "publication");
  } finally {
    if (priorKey === undefined) delete process.env.X402_BUYER_PRIVATE_KEY;
    else process.env.X402_BUYER_PRIVATE_KEY = priorKey;
    await rm(directory, { recursive: true, force: true });
  }
});

test("resume completes the receipt after an interruption with the identical artifact already saved", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-interrupted-"));
  try {
    const recoveryFile = join(directory, "purchase.json");
    const output = join(directory, "publication.bin");
    const body = Buffer.from("already recovered bytes");
    const recovery = {
      version: 1,
      method: "GET",
      url: handbookUrl,
      output,
      paymentSignature: "same-signed-payment",
      paymentRecovery: "c".repeat(64),
    };
    await writeFile(recoveryFile, `${JSON.stringify(recovery)}\n`, { mode: 0o600 });
    await writeFile(output, body);
    const paymentResponse = encodePaymentResponseHeader({
      success: true,
      network: "eip155:8453",
      transaction: `0x${"6".repeat(64)}`,
      payer: `0x${"7".repeat(40)}`,
    });

    const result = await runPurchase({ resume: recoveryFile }, {
      fetchImpl: async (url, init) => {
        assert.equal(url, handbookUrl);
        assert.equal(init.headers["payment-signature"], recovery.paymentSignature);
        assert.equal(init.headers["x-payment-recovery"], recovery.paymentRecovery);
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/zip", "payment-response": paymentResponse },
        });
      },
    });

    assert.equal((await readFile(result.outputPath)).toString(), body.toString());
    const receipt = JSON.parse(await readFile(result.receiptPath, "utf8"));
    assert.equal(receipt.url, handbookUrl);
    assert.equal(receipt.method, "GET");
    assert.equal(receipt.artifactSha256.length, 64);
    await assert.rejects(readFile(recoveryFile), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("resume refuses unrelated existing output bytes and leaves recovery intact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-conflict-"));
  try {
    const recoveryFile = join(directory, "purchase.json");
    const output = join(directory, "publication.bin");
    const recovery = {
      version: 1,
      method: "GET",
      url: handbookUrl,
      output,
      paymentSignature: "same-signed-payment",
      paymentRecovery: "d".repeat(64),
    };
    await writeFile(recoveryFile, `${JSON.stringify(recovery)}\n`, { mode: 0o600 });
    await writeFile(output, "unrelated local data");
    const paymentResponse = encodePaymentResponseHeader({
      success: true,
      network: "eip155:8453",
      transaction: `0x${"8".repeat(64)}`,
      payer: `0x${"9".repeat(40)}`,
    });

    await assert.rejects(runPurchase({ resume: recoveryFile }, {
      fetchImpl: async () => new Response("purchased bytes", {
        status: 200,
        headers: { "content-type": "application/zip", "payment-response": paymentResponse },
      }),
    }), /output file already exists with different contents/u);
    assert.equal((await readFile(output, "utf8")), "unrelated local data");
    assert.equal(JSON.parse(await readFile(recoveryFile, "utf8")).paymentRecovery, "d".repeat(64));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a fresh purchase refuses to overwrite an existing output before contacting the market", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-fresh-conflict-"));
  try {
    const output = join(directory, "publication.bin");
    const recoveryFile = join(directory, "purchase.json");
    await writeFile(output, "keep this file");
    let requests = 0;
    await assert.rejects(runPurchase({
      url: handbookUrl,
      maximumAmount: "29000000",
      output,
      recoveryFile,
    }, {
      fetchImpl: async () => { requests += 1; throw new Error("market should not be called"); },
    }), /output file already exists/u);
    assert.equal(requests, 0);
    assert.equal((await readFile(output, "utf8")), "keep this file");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("resume rejects an existing receipt for a different method", async () => {
  const directory = await mkdtemp(join(tmpdir(), "market-publication-receipt-conflict-"));
  try {
    const recoveryFile = join(directory, "purchase.json");
    const output = join(directory, "publication.bin");
    const body = Buffer.from("saved artifact");
    const recovery = {
      version: 1,
      method: "GET",
      url: handbookUrl,
      output,
      paymentSignature: "same-signed-payment",
      paymentRecovery: "e".repeat(64),
    };
    await writeFile(recoveryFile, `${JSON.stringify(recovery)}\n`, { mode: 0o600 });
    await writeFile(output, body);
    await writeFile(`${output}.PAYMENT-RESPONSE.json`, JSON.stringify({
      type: "X402PaymentResponseReceipt",
      url: handbookUrl,
      method: "POST",
      artifactSha256: "0".repeat(64),
    }));
    const paymentResponse = encodePaymentResponseHeader({
      success: true,
      network: "eip155:8453",
      transaction: `0x${"a".repeat(64)}`,
      payer: `0x${"b".repeat(40)}`,
    });

    await assert.rejects(runPurchase({ resume: recoveryFile }, {
      fetchImpl: async () => new Response(body, {
        status: 200,
        headers: { "content-type": "application/zip", "payment-response": paymentResponse },
      }),
    }), /payment receipt already exists with different contents/u);
    assert.equal(JSON.parse(await readFile(recoveryFile, "utf8")).paymentRecovery, "e".repeat(64));
    assert.equal(JSON.parse(await readFile(`${output}.PAYMENT-RESPONSE.json`, "utf8")).method, "POST");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
