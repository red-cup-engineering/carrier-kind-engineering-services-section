import assert from "node:assert/strict";
import test from "node:test";
import { addresses } from "./_address-fixtures.mjs";

// Recorded with the Node-only (Buffer) content-address implementation, before SignCell,
// SignChain, SignGraph and SignCraft moved to portable Uint8Array helpers.
const RECORDED = {
  "id:null": "ni:///sha-256;sLKYi2u-ckus2l6eUkc23gvH2uQcRrQhPFDh011OXxM",
  "hex:null": "b0b2988b6bbe724bacda5e9e524736de0bc7dae41c46b4213c50e1d35d4e5f13",
  "id:true": "ni:///sha-256;J6ve3f6FA0lq3rYjRmyqR9pfY6vSvG-hn2z8tz7P7XA",
  "hex:true": "27abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70",
  "id:zero": "ni:///sha-256;bjQLnP-zepicpUTmu3gKLHiQHT-zNzh2hRGjBhevoB0",
  "hex:zero": "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d",
  "id:negative": "ni:///sha-256;lR3O46ek86rGfsdqLORGnMdt9lDxNL8lcr9gplyYIzg",
  "hex:negative": "951dcee3a7a4f3aac67ec76a2ce4469cc76df650f134bf2572bf60a65c982338",
  "id:float": "ni:///sha-256;tou0XsqwMpq4Fdr0T1oC0qEairh_u99LCLyuAMraAyQ",
  "hex:float": "b68bb45ecab0329ab815daf44f5a02d2a11a8ab87fbbdf4b08bcae00cada0324",
  "id:big": "ni:///sha-256;hPn0qHk9CobcOb0zqT7Mhwx-7j8hygoPM2VwTgbD1xc",
  "hex:big": "84f9f4a8793d0a86dc39bd33a93ecc870c7eee3f21ca0a0f3365704e06c3d717",
  "id:safeMax": "ni:///sha-256;FPUC6KMDQCiLnamO1V2fIwyKku6GM2GY320bTiePPR4",
  "hex:safeMax": "14f502e8a30340288b9da98ed55d9f230c8a92ee86336198df6d1b4e278f3d1e",
  "id:unicode": "ni:///sha-256;XewOEHY6_wruwGaBUxIgEHJZaWbW5rJK5Cx5WIPR-lE",
  "hex:unicode": "5dec0e10763aff0aeec066815312201072596966d6e6b24ae42c795883d1fa51",
  "id:nfd": "ni:///sha-256;2WkRa-i2ZRqaDML9ZYdCDKspxSg98yP19wzOm_h5CZM",
  "hex:nfd": "d969116be8b6651a9a0cc2fd6587420cab29c5283df323f5f70cce9bf8790993",
  "id:bytes": "ni:///sha-256;bGnNTtZ8dcXVqtU6tH09lZYdvqkUwl4PWwSjZP5aX8I",
  "hex:bytes": "6c69cd4ed67c75c5d5aad53ab47d3d95961dbea914c25e0f5b04a364fe5a5fc2",
  "id:emptyBytes": "ni:///sha-256;w2QfhUTXwC81gLB8D5iH8Maif_WrHUo-Kcrxl8_Cma4",
  "hex:emptyBytes": "c3641f8544d7c02f3580b07c0f9887f0c6a27ff5ab1d4a3e29caf197cfc299ae",
  "id:nested": "ni:///sha-256;z3zyw8XQEGE_S8nT5-OodXZYO52JN8QE-dfa30jlB-E",
  "hex:nested": "cf7cf2c3c5d010613f4bc9d3e7e3a87576583b9d8937c404f9d7dadf48e507e1",
  "id:list": "ni:///sha-256;IWj6NjJQ_tFWaAwhwtxFtNw5S4UOe_JimAsqWVmktfE",
  "hex:list": "2168fa363250fed156680c21c2dc45b4dc394b850e7bf262980b2a5959a4b5f1",
  "cell:plain": "ni:///sha-256;5e7pnxq_zMON0fK8cdzFJz4bI5q8pRcxjLPWj4aw_ag",
  "cell:evidenced": "ni:///sha-256;5e7pnxq_zMON0fK8cdzFJz4bI5q8pRcxjLPWj4aw_ag",
  "cell:unicode": "ni:///sha-256;4uGd8rH8W3vDiITxoVTpQ9-WrwOCUMQ36YQoDi9tZw0",
  "historyHeads": [
    "ni:///sha-256;B4mLbdNjczKn-77yb-vIxYzVAjQ17qXF3YxGV34ge5U"
  ],
  "historyRevisionIds": [
    "ni:///sha-256;om2ubDFpb0DVLk1UsWZnlGkO_soR3F60uTsfL9AN2pw",
    "ni:///sha-256;aNT9Q887WDMovYRRtj_HfVM0ayN3CIPwLM9QP52Bzvo",
    "ni:///sha-256;B4mLbdNjczKn-77yb-vIxYzVAjQ17qXF3YxGV34ge5U"
  ]
};

test("cell addresses and SignCraft history heads are byte-identical to the pre-portability record", () => {
  const now = addresses();
  for (const key of Object.keys(RECORDED)) assert.deepEqual(now[key], RECORDED[key], key);
});
