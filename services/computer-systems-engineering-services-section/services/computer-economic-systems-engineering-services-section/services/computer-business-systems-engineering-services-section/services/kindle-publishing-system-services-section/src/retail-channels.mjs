import { admitAcceptedEbook, admitAcceptedPrintEdition, declaresAnswers, validationPublicKey } from "./edition-gates.mjs";
import { guidedRehearsalDriver, guidedRetailDriver } from "./guided-retail-driver.mjs";
import { KDP_CHANNEL, KDP_TITLE_ALLOWANCE, readKdpConfig } from "./kdp-submit.mjs";
import { isSessionValid, sessionPath, signInCommand, webAccount } from "@red-cup-engineering/assisted-browser-services-section/accounts";
import { runRetailSubmission } from "./retail-submission.mjs";

/**
 * Every retail channel the house submits editions to, as definitions for the
 * one submission machine (retail-submission.mjs). KDP's Kindle eBook has its
 * own mapped driver (kdp-submit.mjs). The others are guided: until a
 * discovery walk maps a portal's forms, the person at a visible browser does
 * each step from a panel of the listing's values, while the gate, the file
 * uploads, the resume state and the receipt stay exact.
 *
 * Kobo has no channel: Kobo refuses AI-generated books, and the house does
 * not route around a retailer's policy through a distributor.
 */

const picked = (fields, names) => Object.fromEntries(names.filter((name) => fields[name] !== undefined).map((name) => [name, fields[name]]));

/**
 * A channel's step inputs: the listing fields each step is given (those the
 * listing has), the artifact an upload step sends, and, on the declarations
 * step, the founder's answers in the portal's own terms where the receipt
 * records them.
 */
function stepInputs(name, inputs, uploads, { declarationsStep, portalAnswers = () => ({}) } = {}) {
  return function stepInput(step, fields, artifacts, { declarationsReceipt } = {}) {
    if (!Object.hasOwn(inputs, step)) throw new TypeError(`unknown ${name} step ${step}`);
    return {
      ...(uploads[step] ? { path: artifacts[uploads[step]] } : {}),
      ...picked(fields, inputs[step]),
      ...(step === declarationsStep ? portalAnswers(declarationsReceipt) : {}),
    };
  };
}

const EBOOK_DETAILS = ["title", "subtitle", "series", "subseries", "author", "contributors", "publisher", "language", "description", "keywords", "subjects", "aiDisclosure", "aiCategories", "identifier"];
const EBOOK_PRICING = ["listPriceUsd", "territories", "royalty", "revenueSplit", "drm"];

/**
 * An ebook retailer whose portal is guided. Its gate is the signed passing
 * validation of the exact EPUB and cover, the release acceptance of that
 * EPUB and, where the validation assays the retailer's reading system, that
 * assay. The founder's declarations receipt must cover the listing's AI
 * answers before the details step.
 */
function guidedEbookChannel({ id, name, portability, guide }) {
  const steps = Object.freeze(["create-title", "details", "upload-epub", "upload-cover", "pricing", "publish"]);
  const uploads = Object.freeze({ "upload-epub": "epub", "upload-cover": "cover" });
  const inputs = { "create-title": ["title", "language"], details: EBOOK_DETAILS, "upload-epub": ["drm"], "upload-cover": [], pricing: EBOOK_PRICING, publish: [] };
  return Object.freeze({
    id, retailer: id, name, steps, uploads,
    forms: Object.freeze([Object.freeze(["create-title", "details"]), Object.freeze(["upload-epub", "upload-cover"])]),
    async admit(admitted, capabilities) {
      const publicKey = capabilities.publicKey ?? await validationPublicKey(capabilities.validationPublicKeyPath);
      const config = capabilities.config ?? Object.freeze({ storageState: sessionPath(id), start: webAccount(id).start });
      return { ...await admitAcceptedEbook(name, admitted, publicKey, { portability }), config };
    },
    stepInput: stepInputs(name, inputs, uploads, { declarationsStep: "details" }),
    declarations: Object.freeze({ step: "details", answers: (fields) => fields.aiDisclosure, covers: (receipt, book, fields) => declaresAnswers(receipt, book, fields.aiDisclosure) }),
    receipt: (fields, exact) => ({ rendition: "EPUB", artifactSha256: exact.epub.sha256, coverSha256: exact.cover.sha256, priceTerms: picked(fields, EBOOK_PRICING) }),
    session: Object.freeze({
      check: (config, capabilities) => isSessionValid(id, { storageState: config.storageState }, capabilities),
      command: signInCommand(id), reason: `${id}-session-missing-or-expired`,
    }),
    liveDriver: guidedRetailDriver({ retailer: id, name, guide }),
    fixtureDriver: guidedRehearsalDriver({ name, guide }),
    rehearses: true,
  });
}

/** The panel's words for the steps every guided ebook portal shares. */
const ebookGuide = ({ create, details, pricing, publish }) => Object.freeze({
  "create-title": { say: create },
  details: { say: details },
  "upload-epub": { say: "Upload the EPUB: click the portal's upload or browse control for the book file." },
  "upload-cover": { say: "Upload the cover image: click the portal's upload or browse control for the cover." },
  pricing: { say: pricing },
  publish: { say: publish, irreversible: true },
});

export const GOOGLE_PLAY_BOOKS_CHANNEL = guidedEbookChannel({
  id: "google-play-books", name: "Google Play Books", portability: "google-play-books-2026-09",
  guide: ebookGuide({
    create: "In the book catalog, add a new ebook with no ISBN (Google assigns a GGKEY), and open its book details.",
    details: "Enter the book details below: the title, subtitle, series and volume, the author as a contributor, the language, the description and the subjects. Where the portal asks about AI, answer from the AI disclosure below. Save.",
    pricing: "On pricing, set the US list price below for worldwide sale, letting Google convert it for other currencies. Save.",
    publish: "Publish the book, once every tab is complete.",
  }),
});

export const APPLE_BOOKS_CHANNEL = guidedEbookChannel({
  id: "apple-books", name: "Apple Books", portability: "apple-books-2026-09",
  guide: ebookGuide({
    create: "Start a new ebook in Apple Books for Authors, with no ISBN, and open its book details.",
    details: "Enter the book details below: the title, subtitle, series and number, the description, the categories closest to the subjects, and the language. Add each contributor below with the role it names; Apple asks an AI-generated book to name its model with the role AI Generated by. Save.",
    pricing: "On pricing and availability, set the US list price below and make it available worldwide. Save.",
    publish: "Submit the book for review and sale.",
  }),
});

export const BARNES_NOBLE_PRESS_CHANNEL = guidedEbookChannel({
  id: "barnes-noble-press", name: "B&N Press", portability: null,
  guide: ebookGuide({
    create: "Create a new eBook project in B&N Press.",
    details: "Enter the project details below: the title, subtitle, series, the author, the publisher, the description, the keywords and the BISAC subjects. On B&N's use of generative AI questions, choose the AI categories below. Save.",
    pricing: "On pricing, set the US list price below, with no DRM. Save.",
    publish: "Put the eBook on sale.",
  }),
});

const PAPERBACK_STEPS = Object.freeze(["create-title", "details", "isbn", "print-options", "upload-interior", "upload-cover", "declarations", "preview", "pricing", "publish"]);
const PAPERBACK_UPLOADS = Object.freeze({ "upload-interior": "interior", "upload-cover": "cover" });
const PAPERBACK_PRICING = ["listPriceUsd", "territories", "royalty", "expandedDistribution"];
const PAPERBACK_INPUTS = {
  "create-title": ["title"], details: ["title", "subtitle", "series", "subseries", "author", "publisher", "language", "description", "keywords", "subjects", "categories"],
  isbn: ["isbn", "publisher"], "print-options": ["paper", "trim", "bleed", "finish"],
  "upload-interior": [], "upload-cover": [], declarations: ["aiDisclosure"], preview: [], pricing: PAPERBACK_PRICING, publish: [],
};
const PAPERBACK_GUIDE = Object.freeze({
  "create-title": { say: ({ title }) => `On the Bookshelf, find the ${title} Kindle eBook and click + Create paperback, so the paperback is linked to it and its details carry over.` },
  details: { say: "Check the paperback details against the values below; the series is the ebook's. Save and Continue." },
  isbn: { say: "Choose Get a free KDP ISBN and assign it: an ISBN cannot be taken back once assigned.", irreversible: true },
  "print-options": { say: "Set the print options below: the ink and paper, the trim size, the bleed and the cover finish." },
  "upload-interior": { say: "Upload the manuscript: click Upload paperback manuscript." },
  "upload-cover": { say: "Choose Upload a cover you already have (print-ready PDF), then click Upload your cover file. Leave the barcode to KDP." },
  declarations: { say: "Answer the AI-generated content questions with the founder's declared KDP options below, for text, images and translations, and name the tools below." },
  preview: { say: "Launch the Previewer, page through, and Approve once it shows no errors. Then Save and Continue." },
  pricing: { say: "Set the territories, the US list price, and Expanded Distribution as below." },
  publish: { say: "Click Publish Your Paperback Book.", irreversible: true },
});
/** A KDP paperback's address carries its title id once KDP has saved it. */
const paperbackTitle = (url) => /\/title-setup\/paperback\/(?!new(?:\/|$))([A-Za-z0-9-]+)(?:\/|$)/u.exec(new URL(url).pathname)?.[1] ?? null;

/**
 * KDP's paperback, through the same KDP account as the Kindle eBook. Its gate
 * is the accepted print edition: the proofed, preflighted interior and
 * full-wrap cover PDFs for KDP's paperback profile. The free ISBN and the
 * publish click are the person's, in the portal.
 */
export const KDP_PAPERBACK_CHANNEL = Object.freeze({
  id: "kdp-paperback", retailer: "kdp", name: "KDP paperback",
  steps: PAPERBACK_STEPS, uploads: PAPERBACK_UPLOADS, titleAllowance: KDP_TITLE_ALLOWANCE,
  forms: Object.freeze([
    Object.freeze(["create-title", "details"]),
    Object.freeze(["isbn", "print-options", "upload-interior", "upload-cover", "declarations", "preview"]),
    Object.freeze(["pricing", "publish"]),
  ]),
  async admit(admitted, capabilities) {
    const kdp = capabilities.config ?? await readKdpConfig(capabilities.configPath);
    const config = Object.freeze({ ...kdp, start: kdp.start ?? `${kdp.marketplace}/bookshelf` });
    return { ...await admitAcceptedPrintEdition("KDP paperback", admitted, { profile: "kdp-paperback-v1" }), config };
  },
  stepInput: stepInputs("KDP paperback", PAPERBACK_INPUTS, PAPERBACK_UPLOADS, {
    declarationsStep: "declarations",
    // KDP asks the same questions for both formats: the receipt's answers in KDP's own options.
    portalAnswers: (receipt) => ({ kdpOptions: receipt?.kdpForm?.options ?? null, kdpTools: receipt?.kdpForm?.tools ?? null }),
  }),
  declarations: Object.freeze({ step: "declarations", answers: (fields) => fields.aiDisclosure, covers: (receipt, book, fields) => declaresAnswers(receipt, book, fields.aiDisclosure) }),
  receipt: (fields, exact) => ({ rendition: "PDF", artifactSha256: exact.interior.sha256, coverSha256: exact.cover.sha256, priceTerms: picked(fields, PAPERBACK_PRICING) }),
  session: KDP_CHANNEL.session,
  liveDriver: guidedRetailDriver({ retailer: "kdp", name: "KDP paperback", guide: PAPERBACK_GUIDE, identify: paperbackTitle }),
  fixtureDriver: guidedRehearsalDriver({ name: "KDP paperback", guide: PAPERBACK_GUIDE }),
  rehearses: true,
});

/** Each channel by id, with what its gate is given: the ebooks their validation, the paperback its print acceptance. */
export const RETAIL_CHANNELS = Object.freeze({
  kdp: KDP_CHANNEL,
  "kdp-paperback": KDP_PAPERBACK_CHANNEL,
  "google-play-books": GOOGLE_PLAY_BOOKS_CHANNEL,
  "apple-books": APPLE_BOOKS_CHANNEL,
  "barnes-noble-press": BARNES_NOBLE_PRESS_CHANNEL,
});

export function retailChannel(id) {
  if (!Object.hasOwn(RETAIL_CHANNELS, id)) throw new TypeError(`no retail channel ${id}; channels: ${Object.keys(RETAIL_CHANNELS).join(", ")}`);
  return RETAIL_CHANNELS[id];
}

export const submitToRetailChannel = (id, inputs, capabilities = {}) => runRetailSubmission(retailChannel(id), inputs, capabilities);
