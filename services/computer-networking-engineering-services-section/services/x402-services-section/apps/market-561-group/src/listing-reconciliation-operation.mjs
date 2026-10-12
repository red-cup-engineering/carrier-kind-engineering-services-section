import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { createR2RestClient, r2RestConfiguration } from "@red-cup-engineering/cloudflare-r2-services-section/r2-rest";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { reconcilePaidReleases } from "@red-cup-engineering/digital-goods-storefront-services-section/paid-release-staging";

import source from "../../../data/market-561-group/records/catalog.json" with { type: "json" };
import { reconcile402indexListings, writeReconciliationReceipt } from "../scripts/reconcile-402index-listings.mjs";
import { auditPublicMarketProjection } from "../scripts/audit-public-projection.mjs";

const repositoryRoot = import.meta.filename.split("/lib/emsenn/services/")[0];
const servicesRoot = resolve(repositoryRoot, "lib/emsenn/services/561-group/services");
// The one goods bucket the market's publication offers and the shop both deliver from.
const GOODS_BUCKET = "shop-561-group-goods";


export function x402MarketProjectionAuditOperation({ environment = process.env, clock = () => new Date().toISOString(), fetch = globalThis.fetch } = {}) {
  return operation({
    verb: "x402-market-projection-audit", inputFormat: "json", outputFormat: "json",
    summary: "Audit the canonical x402 catalog against the public market's live 402 behavior.",
    description: "Reads the compiled source catalog plus public market status/catalog, probes every listed offer with its canonical unsigned request, classifies runtime/proxy/admission/configuration failures, and writes a dated drift receipt.",
    reads: ["X402_PROJECTION_RECEIPTS"],
    writes: ["x402-market-public-projection-audit"],
    effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async () => {
      const receipt = await auditPublicMarketProjection({ fetch, now: clock });
      const directory = environment.X402_PROJECTION_RECEIPTS ?? join(homedir(), ".local", "state", "561-group", "x402-market", "projection");
      await mkdir(directory, { recursive: true });
      const receiptPath = join(directory, `${receipt.observedAt.replace(/[:.]/gu, "-")}-public-projection-audit.json`);
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      return Object.freeze({ ...receipt, receiptPath });
    },
  });
}

export function x402MarketListingReconcileOperation({ environment = process.env, clock = () => new Date().toISOString() } = {}) {
  return operation({
    verb: "x402-market-listing-reconcile", inputFormat: "json", outputFormat: "json",
    summary: "Reconcile the market's 402index listings against what it sells today.",
    description: "Derives every catalog offer's registration, probes each for a 402, registers unlisted sellable offers, patches drifted listings and withdraws dead ones as the verified domain owner, and writes a dated receipt.",
    reads: ["INDEX402_MARKET_VERIFICATION_TOKEN", "X402_INDEX_RECEIPTS"],
    writes: ["x402-market-402index-reconciliation-receipt"],
    effects: { class: "external", replay: "coordinated", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async () => {
      const receipt = await reconcile402indexListings({ environment, now: clock });
      return Object.freeze({ ...receipt, receiptPath: await writeReconciliationReceipt(receipt, environment.X402_INDEX_RECEIPTS === undefined ? {} : { directory: environment.X402_INDEX_RECEIPTS }) });
    },
  });
}

/**
 * Stage every publication the market sells at the edition its acceptance names. The market
 * compiles each publication offer's intended edition from the acceptance record and refuses to
 * sell a staged release that is not it, so staging is derived here from the same records instead
 * of waiting on a hand-run stage-paid-release.
 */
export function x402MarketPaidReleaseReconcileOperation({ environment = process.env, clock = () => new Date().toISOString(), store } = {}) {
  return operation({
    verb: "x402-market-paid-release-reconcile", inputFormat: "json", outputFormat: "json",
    summary: "Stage every sold publication at the edition its acceptance record names.",
    description: "Reads the shop catalog the market's publication offers select from, compares each accepted edition with the release pointer in the goods bucket, builds and puts the bundle and pointer of every edition the bucket lags, and writes a dated receipt.",
    reads: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "X402_PAID_RELEASE_RECEIPTS"],
    writes: ["x402-market-paid-release-reconciliation-receipt"],
    effects: { class: "external", replay: "coordinated", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async (input = {}) => {
      const catalogs = [...new Set(source.filter((declaration) => declaration.publication).map((declaration) => declaration.publication.catalog))];
      const directory = environment.X402_PAID_RELEASE_RECEIPTS ?? join(homedir(), ".local", "state", "561-group", "x402-market", "paid-releases");
      const goods = store ?? createR2RestClient({ ...r2RestConfiguration(environment), bucket: GOODS_BUCKET });
      const observedAt = clock();
      const reconciled = [];
      for (const catalog of catalogs) {
        reconciled.push({ catalog, ...await reconcilePaidReleases({ catalog: JSON.parse(await readFileText(resolve(repositoryRoot, catalog))), servicesRoot, store: goods, out: join(directory, "staging"), dryRun: input.dryRun === true }) });
      }
      const receipt = Object.freeze({ recordType: "561-group.x402-market-paid-release-reconciliation-receipt", observedAt, bucket: GOODS_BUCKET, dryRun: input.dryRun === true, catalogs: reconciled });
      await mkdir(directory, { recursive: true });
      const receiptPath = join(directory, `${observedAt.replace(/[:.]/gu, "-")}-paid-release-reconciliation-receipt.json`);
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      return Object.freeze({ ...receipt, receiptPath });
    },
  });
}

export function x402MarketListingOperations(binding) {
  return Object.freeze([
    x402MarketProjectionAuditOperation({ clock: binding.now }),
    x402MarketPaidReleaseReconcileOperation({ clock: binding.now }),
    x402MarketListingReconcileOperation({ clock: binding.now }),
  ]);
}
