import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { objectCapability } from '@red-cup-engineering/computer-networking-engineering-services-section/object-capability';
import { put } from '@red-cup-engineering/semiotic-eavt-services-section/store';
import { purchaseObservationRow, readX402Purchase } from '@red-cup-engineering/x402-services-section/purchase-observation';
import { accountableTransaction, verifyAccountableTransaction } from '../src/accountable-transaction/codec.mjs';
import { readPurchaseObservation } from '../src/accountable-transaction/purchase-record.mjs';

const at = '2026-10-06T23:44:00Z';
const url = 'https://merchant.example/report';
const capability = objectCapability({ holder: 'enterprise:buyer', resource: url, actions: ['read'] });
const requirement = { scheme: 'exact', network: 'eip155:8453', asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', payTo: '0x2222222222222222222222222222222222222222', amount: '7' };
const challenge = { x402Version: 2, resource: { url }, accepts: [requirement] };
// Explicit local facilitator-report fixture; this is not an on-chain payment.
const receipt = { type: 'X402HttpPurchaseReceipt', customer: 'eip155:8453:0x1111111111111111111111111111111111111111', request: { url, method: 'GET', bodySha256: '0'.repeat(64) }, requirement, status: 500, settlement: { success: true, network: requirement.network, transaction: '0x' + 'a'.repeat(64) } };
function report(observation, overrides = {}) {
  return verifyAccountableTransaction(accountableTransaction({ id: 'local-purchase', recordedAt: at, capability,
    invocation: { kind: 'capability.invocation', actor: capability.holder, resource: url, action: 'read', input: null },
    challenge, receipt: observation, attestBy: capability.holder, ...overrides }));
}

test('the books retain a reported charge when delivery and acceptance are unobserved', () => {
  const r = report(receipt);
  assert.equal(r.authorized, true);
  assert.equal(r.settlementReported, true);
  assert.equal(r.responseObserved, false);
  assert.equal(r.acceptance, 'unobserved');
  assert.equal(r.paymentEvidence, 'facilitator-reported');
  assert.equal('paid' in r, false);
  assert.equal(report(receipt, { challenge: { ...challenge, accepts: [{ ...requirement, amount: '8' }] } }).settlementReported, false);
  assert.equal(report({ ...receipt, settlement: { ...receipt.settlement, success: false } }).settlementReported, false);
});

test('balanced synthetic receipts survive as claims and establish no payment', () => {
  const r = report({ kind: 'x402.receipt', valueConserved: true, debit: { num: 7 }, credit: { num: 7 } });
  assert.equal(r.settlementReported, false);
  assert.equal(r.accountable, false);
  assert.equal(r.paymentEvidence, 'unrecognized');
});

test('the enterprise journal replays the exact purchase and refuses arbitrary receipt cells', () => {
  const directory = mkdtempSync(join(tmpdir(), '561-purchase-carrier-'));
  try {
    const books = join(directory, 'buyer', 'data');
    put(books, 'native-purchase', { row: purchaseObservationRow(receipt, at) });
    const recovered = readPurchaseObservation(books, 'native-purchase');
    assert.deepEqual(recovered, receipt);
    assert.equal(readX402Purchase(recovered).settlementReported, true);
    assert.deepEqual(readPurchaseObservation(books, 'native-purchase'), recovered);
    put(books, 'synthetic-claim', { row: ['claimant', 'debit', { num: 7 }, at] });
    put(books, 'synthetic-claim', { row: ['claimant', 'credit', { num: 7 }, at] });
    assert.throws(() => readPurchaseObservation(books, 'synthetic-claim'), /exactly one observation/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
