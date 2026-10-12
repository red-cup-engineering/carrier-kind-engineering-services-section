import { join, resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { ACTOR, CATEGORY, CHANNEL, NODE_ROOT, canonical, contentId } from "./research.mjs";

export const LEGACY_RECTIFICATION_CATEGORY = "climate-research.legacy-pilot-public-reuse-rectification";

function exactRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, law: _law, ...body } = value;
  return id === contentId(body);
}

function journal(options = {}) { return createSemanticRecordJournal({ root: resolve(options.dataRoot ?? join(NODE_ROOT, "data")), objectKind: "emsweb.climate-research.record" }); }
function records(category, options) { return journal(options).query({ category }).map(({ record }) => record); }

function witnessed(records, packet) {
  return records.some((row) => row.id === packet.id);
}

export async function admitLegacyPilotPublicReuseRectification({ legacyPacket, currentPacket } = {}, options = {}) {
  if (!exactRecord(legacyPacket) || !exactRecord(currentPacket)) throw new TypeError("legacy pilot rectification requires exact research packets");
  if (legacyPacket.provider !== ACTOR || legacyPacket.customer !== CHANNEL || legacyPacket.status !== "admitted-private-pilot-public-reuse-audit-pending" || !legacyPacket.reuseGrant?.includes("private-youtube-pilot") || legacyPacket.reuseGrant?.includes("public-youtube-release")) throw new TypeError("legacy pilot rectification requires one private-pilot-only research packet");
  if (currentPacket.provider !== ACTOR || currentPacket.customer !== CHANNEL || currentPacket.methodVersion !== 2 || currentPacket.status !== "admitted-public-reuse" || !currentPacket.reuseGrant?.includes("public-youtube-release")) throw new TypeError("legacy pilot rectification requires one method-v2 public-reuse successor");
  if (legacyPacket.marketClearing !== currentPacket.marketClearing || canonical(legacyPacket.place) !== canonical(currentPacket.place)) throw new TypeError("legacy and current research packets must cover the same clearing and place");
  if (!legacyPacket.citations?.some((row) => row.id === "open-meteo-climate-api") || !currentPacket.citations?.some((row) => row.id === "nasa-nex-gddp-cmip6-license")) throw new TypeError("legacy pilot rectification lacks the required source-rights lineage");
  const dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data")), packets = records(CATEGORY, { ...options, dataRoot });
  if (!witnessed(packets, legacyPacket) || !witnessed(packets, currentPacket)) throw new TypeError("legacy pilot rectification research packets are not witnessed by the supplier");
  const place = `${legacyPacket.place.name}, ${legacyPacket.place.region}`;
  const publicDescriptionAddendum = [
    "Legacy pilot method and reuse note:",
    `This episode uses NASA POWER reanalysis and three HighResMIP/CMIP6 models processed and bias-corrected by Open-Meteo, comparing ${legacyPacket.projection.baseline} with ${legacyPacket.projection.future}.`,
    "Open-Meteo data are used under CC BY 4.0. Attribution: Weather data by Open-Meteo.com — https://open-meteo.com/ — and the CMIP6 program.",
    `This ${place} pilot predates the channel's method-v2 direct NASA NEX-GDDP-CMIP6 SSP5-8.5 standard. Its figures remain a legacy conditional comparison and are not the method-v2 series.`,
    "Creator monetization of this legacy episode is withheld pending a separate commercial-use admission."
  ].join("\n");
  const auditedAt = options.at ?? new Date().toISOString(), body = {
    type: "ClimateLegacyPilotPublicReuseRectification",
    provider: ACTOR,
    customer: CHANNEL,
    legacyPacket: legacyPacket.id,
    legacySourceDigest: legacyPacket.source.digest,
    currentMethodPacket: currentPacket.id,
    currentMethodSourceDigest: currentPacket.source.digest,
    marketClearing: legacyPacket.marketClearing,
    place: legacyPacket.place,
    reuseGrant: ["non-monetized-public-youtube-educational-release"],
    attributionRequired: true,
    publicDescriptionAddendum,
    rightsEvidence: [
      { url: "https://open-meteo.com/en/license", fact: "API data are offered under CC BY 4.0 with attribution", retrievedAt: auditedAt },
      { url: "https://open-meteo.com/en/docs/climate-api", fact: "Climate API CMIP6 data require attribution to CMIP6 and Open-Meteo", retrievedAt: auditedAt },
      { url: "https://open-meteo.com/en/terms", fact: "Free API acquisition is limited to non-commercial use", retrievedAt: auditedAt },
      { url: "https://registry.opendata.aws/nex-gddp-cmip6/", fact: "Current NASA NEX-GDDP-CMIP6 outputs are CC0", retrievedAt: auditedAt }
    ],
    monetization: "withheld-pending-separate-commercial-use-admission",
    futureLegacyProductionAuthority: "withheld",
    status: "legacy-pilot-public-educational-reuse-admitted",
    rectifiedAt: auditedAt
  }, rectification = { id: contentId(body), ...body };
  const prior = records(LEGACY_RECTIFICATION_CATEGORY, { ...options, dataRoot }).find((row) => row.legacyPacket === legacyPacket.id);
  if (prior) {
    if (prior.id !== rectification.id) throw new TypeError("legacy research packet already has a different immutable rectification");
    return prior;
  }
  journal({ ...options, dataRoot }).record({ category: LEGACY_RECTIFICATION_CATEGORY, recordedAt: auditedAt, record: { ...rectification }, charge: { support: true, refutation: false }, relation: { subject: ACTOR, predicate: "rectifies", object: rectification.id } });
  return rectification;
}
