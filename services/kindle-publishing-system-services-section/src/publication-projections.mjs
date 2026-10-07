import { createHash } from "node:crypto";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";

export const publicationBundleType = defineSchemaType({
  $id: "org.561-group.publishing.publication-bundle.v1", title: "Publication identity bundle",
  description: "Canonical Work, Edition, marketed Rendition, Artifact, and Offer records from which retailer and bibliographic carriers are projected.",
  type: "object", additionalProperties: false, required: ["type", "version", "work", "edition", "rendition", "artifact", "offer", "externalIdentifiers"],
  properties: { type: { const: "PublicationBundle" }, version: { const: 1 }, work: { type: "object" }, edition: { type: "object" }, rendition: { type: "object" }, artifact: { type: "object" }, offer: { type: "object" }, externalIdentifiers: { type: "array", items: { type: "object" } } },
});

function assertIdentity(record, type) { if (record?.type !== type || typeof record.id !== "string" || !record.id) throw new TypeError(`${type} needs its own id`); }

/** Keep internal publishing identities distinct and admit their links before projecting any retailer carrier. */
export function admitPublicationBundle({ work, edition, rendition, artifact, offer, externalIdentifiers = [] }) {
  for (const [record, type] of [[work, "Work"], [edition, "Edition"], [rendition, "Rendition"], [artifact, "Artifact"], [offer, "Offer"]]) assertIdentity(record, type);
  if (edition.work !== work.id) throw new TypeError("Edition must identify its Work");
  if (rendition.edition !== edition.id) throw new TypeError("Rendition must identify its Edition");
  if (artifact.rendition !== rendition.id) throw new TypeError("Artifact must identify its Rendition");
  if (offer.rendition !== rendition.id) throw new TypeError("Offer must identify the marketed Rendition");
  if (work.isbn !== undefined || edition.isbn !== undefined) throw new TypeError("ISBN belongs to a marketed Rendition, never Work or Edition");
  if (rendition.isbn !== undefined && !/^(?:97[89])?\d{9}[\dX]$/u.test(String(rendition.isbn).replaceAll("-", ""))) throw new TypeError("Rendition ISBN is malformed");
  for (const identifier of externalIdentifiers) {
    if (identifier?.type !== "ExternalIdentifier" || identifier.rendition !== rendition.id || !["ASIN", "GGKEY", "APPLE_ID", "KOBO_ID"].includes(identifier.scheme)) throw new TypeError("retailer identifiers are ExternalIdentifier records attached to the Rendition after submission");
  }
  const admitted = createTypedMark(publicationBundleType, { type: "PublicationBundle", version: 1, work, edition, rendition, artifact, offer, externalIdentifiers });
  if (!admitted.ok) throw new TypeError(admitted.refusal.message); return admitted.value;
}

/** Append one or more receiver-assigned identifiers without collapsing them into Work, Edition, or ONIX. */
export function attachExternalIdentifier(bundleCell, input) {
  if (bundleCell?.type !== publicationBundleType.id) throw new TypeError("external identifiers require an admitted PublicationBundle");
  const rendition = bundleCell.content.rendition.id;
  const identifiers = [...bundleCell.content.externalIdentifiers];
  for (const { scheme, value, assignedAt, evidence = null } of Array.isArray(input) ? input : [input]) {
    if (identifiers.some((item) => item.scheme === scheme && item.value === value)) continue;
    identifiers.push({ type: "ExternalIdentifier", scheme, value, rendition, assignedAt, ...(evidence ? { evidence } : {}) });
  }
  if (identifiers.length === bundleCell.content.externalIdentifiers.length) return bundleCell;
  return admitPublicationBundle({ ...bundleCell.content, externalIdentifiers: identifiers });
}

const escapeXml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const digest = (value) => createHash("sha256").update(value).digest("hex");

function accessibilityCodes(evidence) {
  const features = evidence?.features ?? evidence?.checks?.features ?? {};
  return [...new Set([
    ...(features.navigation?.includes("toc") ? ["11"] : []),
    ...(features.navigation?.includes("toc") ? ["13"] : []),
    ...(features.mathml ? ["17"] : []),
  ])];
}

/** ONIX is an outward product projection. It never becomes the internal publication model. */
export function projectOnix(bundleCell, { accessibilityEvidence = null, sender = "561 Group" } = {}) {
  if (bundleCell?.type !== publicationBundleType.id) throw new TypeError("ONIX projection requires an admitted PublicationBundle");
  const { work, edition, rendition, offer } = bundleCell.content;
  const identifier = rendition.isbn
    ? `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${escapeXml(String(rendition.isbn).replaceAll("-", ""))}</IDValue></ProductIdentifier>`
    : `<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>561 Group Rendition</IDTypeName><IDValue>${escapeXml(rendition.id)}</IDValue></ProductIdentifier>`;
  const accessibility = accessibilityCodes(accessibilityEvidence).map((code) => `<ProductFormFeature><ProductFormFeatureType>09</ProductFormFeatureType><ProductFormFeatureValue>${code}</ProductFormFeatureValue></ProductFormFeature>`).join("");
  const contributors = (work.contributors ?? [{ role: "A01", name: work.author ?? "561 Group" }]).map((contributor, index) => `<Contributor><SequenceNumber>${index + 1}</SequenceNumber><ContributorRole>${escapeXml(contributor.role ?? "A01")}</ContributorRole><PersonName>${escapeXml(contributor.name)}</PersonName></Contributor>`).join("");
  const subjects = (edition.subjects ?? []).map((subject) => `<Subject><SubjectSchemeIdentifier>10</SubjectSchemeIdentifier><SubjectCode>${escapeXml(subject)}</SubjectCode></Subject>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ONIXMessage release="3.1"><Header><Sender><SenderName>${escapeXml(sender)}</SenderName></Sender></Header><Product><RecordReference>${escapeXml(rendition.id)}</RecordReference><NotificationType>03</NotificationType>${identifier}<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>ED</ProductForm><ProductFormDetail>E101</ProductFormDetail>${accessibility}<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>${escapeXml(work.title)}</TitleText>${work.subtitle ? `<Subtitle>${escapeXml(work.subtitle)}</Subtitle>` : ""}</TitleElement></TitleDetail>${contributors}<Language><LanguageRole>01</LanguageRole><LanguageCode>${escapeXml(work.language ?? "eng")}</Language>${subjects}</DescriptiveDetail><CollateralDetail>${edition.description ? `<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>${escapeXml(edition.description)}</Text></TextContent>` : ""}</CollateralDetail><PublishingDetail><Imprint><ImprintName>${escapeXml(edition.imprint ?? "561 Group")}</ImprintName></Imprint>${edition.publicationDate ? `<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">${escapeXml(edition.publicationDate.replaceAll("-", ""))}</Date></PublishingDate>` : ""}</PublishingDetail><ProductSupply><SupplyDetail><ProductAvailability>${escapeXml(offer.availability ?? "20")}</ProductAvailability><Price><PriceType>01</PriceType><PriceAmount>${Number(offer.price).toFixed(2)}</PriceAmount><CurrencyCode>${escapeXml(offer.currency ?? "USD")}</CurrencyCode><Territory><RegionsIncluded>${escapeXml(offer.territories ?? "WORLD")}</RegionsIncluded></Territory></Price></SupplyDetail></ProductSupply></Product></ONIXMessage>\n`;
  return Object.freeze({ type: "OnixProjection", version: 1, source: bundleCell.id, mediaType: "application/xml", sha256: digest(xml), xml });
}

export function projectPublicationManifest(bundleCell, { acquisitionUrl = null } = {}) {
  if (bundleCell?.type !== publicationBundleType.id) throw new TypeError("publication manifest requires an admitted PublicationBundle");
  const { work, rendition, artifact, offer } = bundleCell.content;
  return Object.freeze({
    metadata: Object.freeze({ identifier: rendition.id, title: work.title, ...(work.subtitle ? { subtitle: work.subtitle } : {}), language: work.language ?? "en", author: (work.contributors ?? []).map(({ name }) => name), ...(rendition.isbn ? { isbn: rendition.isbn } : {}) }),
    readingOrder: Object.freeze([{ href: artifact.href, type: artifact.mediaType, integrity: `sha256-${artifact.sha256}` }]),
    links: Object.freeze(acquisitionUrl ? [{ rel: "http://opds-spec.org/acquisition/buy", href: acquisitionUrl, type: artifact.mediaType, properties: { price: { currency: offer.currency, value: offer.price } } }] : []),
  });
}

export function projectOpdsEntry(bundleCell, options = {}) {
  const publication = projectPublicationManifest(bundleCell, options);
  return Object.freeze({ metadata: publication.metadata, links: publication.links, images: Object.freeze([]), readingOrder: publication.readingOrder });
}
