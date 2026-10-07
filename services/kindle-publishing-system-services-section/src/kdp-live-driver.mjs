import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { askPerson } from "@red-cup-engineering/assisted-browser-services-section/assist";
import { openWindow } from "@red-cup-engineering/assisted-browser-services-section/window";
import { awaitKdpSignIn, writePrivateStorageState } from "./kdp-session.mjs";

/**
 * The live KDP receiver: kdp.amazon.com's Kindle title-setup pages driven in
 * a visible browser that a person supervises. Selectors come from the
 * 2026-09-29 read-only discovery of the details, content and pricing pages.
 *
 * It works only on the title it creates: the new-title page, then the draft
 * id KDP assigns on the first save. Any other title id refuses the step, so
 * the founder's existing titles are never touched. Widgets the discovery did
 * not map (the categories dialog, the per-territory list a US-only title
 * needs) and the irreversible publish click are handed to the person through
 * an assist bar in the page, as is the series dialog, which KDP loads as a
 * separate widget that ignores driven clicks, and a pre-order's release date
 * in KDP's date picker.
 */

const TITLE_PATH = /^\/[a-z]{2}_[A-Z]{2}\/title-setup\/kindle\/([A-Za-z0-9]+)\/(details|content|pricing)(?:[/?#]|$)/u;
export const KDP_AI_OPTIONS = Object.freeze({
  text: Object.freeze(["NONE", "PARTIAL_AND_MINIMAL", "PARTIAL_AND_EXTENSIVE", "ENTIRE_AND_MINIMAL", "ENTIRE_AND_EXTENSIVE"]),
  images: Object.freeze(["NONE", "FEW_AND_MINIMAL", "FEW_AND_EXTENSIVE", "MANY_AND_MINIMAL", "MANY_AND_EXTENSIVE"]),
  translations: Object.freeze(["NONE", "PARTIAL_AND_MINIMAL", "PARTIAL_AND_EXTENSIVE", "ENTIRE_AND_MINIMAL", "ENTIRE_AND_EXTENSIVE"]),
});
const UPLOAD_TIMEOUT_MS = 15 * 60_000;

function refusal(message, code = "KDP_FORM_REFUSED") { const error = new Error(message); error.code = code; return error; }
const escapeHtml = (text) => text.replace(/[&<>"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const paragraphs = (text) => text.split(/\n{2,}/u).map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`).join("");
const noFirst = (value) => /^no\b/iu.test(String(value ?? "").trim());

/** Admit only the exact KDP option values for the AI-content questionnaire. */
export function kdpAiOptions(options) {
  for (const [question, allowed] of Object.entries(KDP_AI_OPTIONS)) {
    if (!allowed.includes(options?.[question])) throw refusal(`the declarations receipt has no KDP option for AI ${question}`, "KDP_DECLARATION_OPTIONS_MISSING");
  }
  return options;
}

export async function liveKdpDriver({ config, evidenceRoot, book, evidence, notify = (message) => process.stderr.write(`${message}\n`) }, capabilities = {}) {
  const { context, page, close } = await openWindow({ storageState: config.storageState }, capabilities);
  let draft = null;

  const titleId = () => TITLE_PATH.exec(new URL(page.url()).pathname)?.[1] ?? null;
  const ours = () => {
    const id = titleId();
    if (id === null || !(id === draft || (id === "new" && draft === null))) throw refusal(`refusing to act on ${new URL(page.url()).pathname}: it is not the title this submission created`, "KDP_FOREIGN_TITLE");
  };
  async function open(form) {
    if (form !== "details" && draft === null) throw refusal(`the ${form} page needs the draft that saving the details page creates`, "KDP_DRAFT_MISSING");
    const url = `${config.marketplace}/en_US/title-setup/kindle/${draft ?? "new"}/${form}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await awaitKdpSignIn(page, url, { notify });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    ours();
  }
  async function present(selector) {
    const target = page.locator(selector);
    if (!await target.count()) throw refusal(`KDP form selector missing: ${selector}`, "KDP_SELECTOR_MISSING");
    return target.first();
  }
  const fill = async (selector, value) => (await present(selector)).fill(String(value ?? ""));
  const choose = async (selector, value) => (await present(selector)).selectOption(value, { force: true });
  /** KDP draws its own checkboxes and radios over zero-size inputs; when Playwright cannot click one, click its label, then confirm the state. */
  async function tick(target, checked = true) {
    if (await target.isChecked() === checked) return;
    await target.setChecked(checked, { force: true, timeout: 5_000 }).catch(async () => {
      await target.evaluate((element) => (element.closest("label") ?? (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)) ?? element).click());
    });
    if (await target.isChecked() !== checked) throw refusal(`KDP control ${await target.evaluate((element) => element.id || element.name)} did not become ${checked ? "checked" : "unchecked"}`);
  }
  async function checkLabelled(name, pattern) { await checkLabelledIn(`input[name="${name}"]`, pattern, name); }
  async function checkLabelledIn(selector, pattern, what) {
    const inputs = page.locator(selector);
    const index = await inputs.evaluateAll((elements, source) => {
      const match = new RegExp(source, "iu");
      return elements.findIndex((element) => match.test(element.closest("label")?.innerText ?? (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.innerText : "") ?? ""));
    }, pattern.source);
    if (index < 0) throw refusal(`KDP control ${what} has no option labelled ${pattern}`, "KDP_SELECTOR_MISSING");
    await tick(inputs.nth(index));
  }
  const assist = (message) => askPerson(page, `KDP: ${message}`, { notify });
  /**
   * The details page's Pre-order section: release now, or a pre-order released on the plan's date. Its radios are
   * found by their labels, since the 2026-09-29 discovery did not map their names; its date picker is KDP's own
   * widget, so the person sets the date there unless a field labelled as the release date takes it.
   */
  async function setRelease(release) {
    if (!release) return;
    ours();
    await checkLabelledIn('input[type="radio"]', release.preorder ? /available for pre-?order/u : /ready to release (?:my (?:book|ebook) )?now/u, "Pre-order");
    if (!release.preorder) return;
    const spoken = new Date(`${release.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const field = page.getByLabel(/release date/iu).filter({ visible: true });
    if (await field.count() === 1 && await field.evaluate((element) => element.type === "date")) await field.fill(release.date);
    else await assist(`In the Pre-order section, set the release date to ${spoken} (from this book's launch plan), then click Done.`);
  }
  async function saveAndContinue(next) {
    ours();
    await (await present("#save-and-continue-announce")).click();
    await page.waitForURL((url) => TITLE_PATH.exec(url.pathname)?.[2] === next, { timeout: 120_000 }).catch(async () => {
      const alerts = await page.locator(".a-alert-error:visible, .a-alert-warning:visible").allInnerTexts().catch(() => []);
      throw refusal(`KDP did not continue to the ${next} page${alerts.length ? `: ${alerts.join(" | ").replace(/\s+/gu, " ").slice(0, 600)}` : ""}`);
    });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  }
  /** KDP computes each marketplace's price band, rate and royalty after the list price changes; saving before it settles saves no pricing. */
  async function settledPricing() {
    await page.waitForFunction(() => {
      const shown = (selector) => [...document.querySelectorAll(selector)].some((element) => element.offsetParent !== null);
      const prices = [...document.querySelectorAll('input.price-input[name^="data[digital][channels][amazon]"]')].filter((input) => input.offsetParent !== null);
      return prices.length > 0 && prices.every((input) => input.value.trim()) && !shown(".potter-pricing-grid-checking-metadata") && !shown(".potter-pricing-grid-waiting-for-metadata");
    }, null, { timeout: 120_000, polling: 500 }).catch(async () => {
      // Say which condition held, so the next repair starts from the page's state rather than a guess.
      const state = await page.evaluate(() => {
        const shown = (selector) => [...document.querySelectorAll(selector)].filter((element) => element.offsetParent !== null).length;
        const prices = [...document.querySelectorAll('input.price-input[name^="data[digital][channels][amazon]"]')];
        return { url: location.pathname, prices: prices.length, visible: prices.filter((input) => input.offsetParent !== null).length, empty: prices.filter((input) => input.offsetParent !== null && !input.value.trim()).map((input) => input.name), checking: shown(".potter-pricing-grid-checking-metadata"), waiting: shown(".potter-pricing-grid-waiting-for-metadata") };
      }).catch((error) => ({ unreadable: error.message.slice(0, 200) }));
      throw refusal(`KDP did not finish checking the pricing cost factors: ${JSON.stringify(state)}`);
    });
    const errors = await page.locator(".potter-pricing-grid-errors .a-alert-inline-error:visible, .potter-pricing-grid-price-band-error-state").allInnerTexts();
    if (errors.length) throw refusal(`KDP refused the list price: ${errors.join(" | ").replace(/\s+/gu, " ").slice(0, 600)}`);
  }
  /** The status KDP shows under a page's tab: Not Started, In Progress or Complete. */
  async function tabStatus(label) {
    return page.evaluate((name) => {
      const tab = [...document.querySelectorAll("a, div, li")].filter((element) => element.innerText?.trim().startsWith(name) && element.innerText.length < 80).at(-1);
      return /Not Started|In Progress|Complete/u.exec(tab?.innerText ?? "")?.[0] ?? null;
    }, label);
  }
  async function upload(kind, path) {
    ours();
    const input = await present(`#data-assets-${kind}-file-upload-AjaxInput`);
    await input.setInputFiles(path);
    // Playwright's text engine rebuilds these patterns in the page and rejects the u flag.
    const section = kind === "interior" ? /Manuscript "[^"]*" uploaded successfully/ : /Cover uploaded successfully/;
    // KDP keeps hidden copies of its success banners in the page, so wait on a visible one, and stop at a visible error.
    const success = page.getByText(section).filter({ visible: true }).first();
    const failure = page.locator(`#data-assets-${kind}-file-upload-AjaxInput`).locator("xpath=ancestor::*[contains(@class,'a-section')][1]").locator(".a-alert-error").filter({ visible: true }).first();
    const outcome = await Promise.race([
      success.waitFor({ state: "visible", timeout: UPLOAD_TIMEOUT_MS }).then(() => "uploaded"),
      failure.waitFor({ state: "visible", timeout: UPLOAD_TIMEOUT_MS }).then(() => "failed", () => new Promise(() => {})),
    ]);
    if (outcome === "failed") throw refusal(`KDP refused the ${kind} upload: ${(await failure.innerText().catch(() => "")).replace(/\s+/gu, " ").slice(0, 600)}`);
  }

  const steps = {
    async "create-title"(input) {
      await open("details");
      // A resumed draft must be this book's: a draft id recorded by hand is checked against the title KDP holds for it.
      if (draft !== null) {
        const held = (await (await present("#data-title")).inputValue()).trim();
        if (held !== input.title.trim()) throw refusal(`draft ${draft} holds the title "${held}", not "${input.title}"`, "KDP_FOREIGN_TITLE");
      }
      await choose("#data-language-native", input.language.toLowerCase());
      await fill("#data-title", input.title);
    },
    async metadata(input) {
      if (titleId() !== "new") await steps["create-title"](input);
      await fill("#data-subtitle", input.subtitle);
      const names = input.author.trim().split(/\s+/u);
      await fill("#data-primary-author-first-name", names.slice(0, -1).join(" "));
      await fill("#data-primary-author-last-name", names.at(-1));
      const html = paragraphs(input.description);
      const viaEditor = await page.evaluate((value) => { const editor = globalThis.CKEDITOR && Object.values(globalThis.CKEDITOR.instances)[0]; if (!editor) return false; editor.setData(value); return true; }, html);
      if (!viaEditor) await page.frameLocator("iframe.cke_wysiwyg_frame").locator("body").evaluate((body, value) => { body.innerHTML = value; }, html);
      await tick(await present("#non-public-domain"));
      await checkLabelled("data[is_adult_content]-radio", /^\s*no\s*$/u);
      await choose('select[name="data[digital][home_marketplace]"]', "US");
      for (const [index, keyword] of input.keywords.slice(0, 7).entries()) await fill(`#data-keywords-${index}`, keyword);
      await setRelease(input.release);
      await (await present("#categories-modal-button")).click();
      await assist(`Choose the Amazon categories for this book in the dialog (${input.categories} BISAC: ${input.subjects.join(", ")}), save the dialog, then click Done.`);
      await saveAndContinue("content");
      draft = titleId();
      return { remoteIdentifier: draft };
    },
    /** KDP adds a title to a series in its own series dialog, which is not driven: the person creates or selects the series there, then the details page must show it. */
    async series(input) {
      if (!input.series) return {};
      await open("details");
      const joined = async () => await page.locator("#edit_series_description").isVisible() && await page.locator("#edit_series_description").locator("xpath=ancestor::*[.//h4][1]").getByText(input.series.name).filter({ visible: true }).count() > 0;
      if (await page.locator("#edit_series_description").isVisible() && !await joined()) throw refusal(`this title is already in a series other than ${input.series.name}`, "KDP_SERIES_CONFLICT");
      if (!await joined()) {
        ours();
        await (await present("#add_series_button button")).click();
        await assist(`Add this title to the series "${input.series.name}" as number ${input.series.number} in reading order: choose Create series (or Select series if it already exists), fill it in, save the dialog, then click Done.`);
        await open("details");
        if (!await joined()) throw refusal(`the details page does not show this title in the series ${input.series.name}`, "KDP_SERIES_MISSING");
      }
    },
    async "upload-epub"(input) {
      await open("content");
      const preorder = page.locator('input[name="data[is_assetless_preorder_choice]-radio"]');
      if (await preorder.count() && await preorder.first().isVisible()) await checkLabelled("data[is_assetless_preorder_choice]-radio", /^\s*yes\b/u);
      await checkLabelled("data[is_drm]-radio", noFirst(input.drm) ? /^\s*no\b/u : /^\s*yes\b/u);
      if (noFirst(input.drm)) {
        await page.locator("#data-non-drm-download-consent").waitFor({ state: "attached", timeout: 10_000 });
        await tick(await present("#data-non-drm-download-consent"));
      }
      await upload("interior", input.path);
    },
    async "upload-cover"(input) {
      const own = page.getByText(/upload a cover you already have/i);
      if (await own.count()) await own.first().click();
      await upload("cover", input.path);
    },
    async declarations(input) {
      const options = kdpAiOptions(input.kdpOptions);
      const uses = Object.values(options).some((option) => option !== "NONE");
      // The questionnaire's dropdowns sit inside the answer row that says AI was used; the other row says it was not.
      const rows = page.locator("[role=radio].a-accordion-row-a11y");
      const index = await rows.evaluateAll((elements, used) => {
        const questionnaire = document.getElementById("generative-ai-questionnaire-text");
        if (!questionnaire || elements.length !== 2) return -1;
        const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        const opens = follows(elements[0], questionnaire) && !follows(elements[1], questionnaire) ? 0 : follows(elements[1], questionnaire) ? 1 : -1;
        return opens < 0 ? -1 : used ? opens : 1 - opens;
      }, uses);
      if (index < 0) throw refusal("the AI-generated content question is not laid out as discovered", "KDP_SELECTOR_MISSING");
      ours();
      await rows.nth(index).click();
      for (const question of uses ? ["text", "images", "translations"] : []) {
        await choose(`#generative-ai-questionnaire-${question}`, options[question]);
        if (options[question] === "NONE") continue;
        // Each used answer asks which tool made it, in free-text boxes after its dropdown; the first box takes the receipt's tool.
        const tool = input.kdpTools?.[question];
        if (typeof tool !== "string" || !tool.trim()) throw refusal(`the declarations receipt names no tool for AI ${question}`, "KDP_DECLARATION_TOOLS_MISSING");
        // The boxes are labelled by the answer's tools prompt; an upload re-renders the questionnaire and leaves hidden copies, so take the first visible one.
        const box = page.locator(`input[aria-labelledby="generative-ai-questionnaire-${question}-tools-prompt"]`).filter({ visible: true }).first();
        await box.waitFor({ state: "visible", timeout: 10_000 });
        await box.fill(tool);
      }
      // The questionnaire ends with the rights holder's confirmation, which the receipt's attestation stands behind.
      // It is an ARIA checkbox (a div with aria-checked), shown again whenever a manuscript or cover is uploaded.
      if (uses) {
        const confirmations = page.getByRole("checkbox", { name: /confirm that my answers are accurate/iu });
        if (!await confirmations.count()) throw refusal("KDP form selector missing: the AI answers' accuracy confirmation", "KDP_SELECTOR_MISSING");
        for (const confirmation of await confirmations.all()) await tick(confirmation);
      }
      await fill("#data-publisher", input.publisher);
      await saveAndContinue("pricing");
    },
    async pricing(input) {
      await open("pricing");
      const select = page.locator("#data-is-select");
      if (await select.count()) await tick(select.first(), !noFirst(input.kdpSelect));
      if (/^worldwide\b/iu.test(input.territories)) {
        const worldwide = page.getByText(/all territories \(worldwide rights\)/i);
        if (await worldwide.count()) await worldwide.first().click();
      } else if (/^united states only\b/iu.test(input.territories)) {
        // KDP's per-territory list is not driven: the person picks United States there, as with the series dialog.
        const individual = page.getByText(/individual territories/i);
        if (!await individual.count()) throw refusal("KDP form selector missing: Individual territories", "KDP_SELECTOR_MISSING");
        await individual.first().click();
        await assist("Under Individual territories, select United States only (clear every other territory), then click Done.");
      } else throw refusal(`only worldwide and United States territories are driven; the listing says: ${input.territories}`);
      await choose('select[name="data[digital][home_marketplace]"]', "US");
      await checkLabelled("data[digital][royalty_rate]-radio", new RegExp(`^\\s*${input.royalty.replace("%", "\\s*%")}`, "u"));
      await fill('input[name="data[digital][channels][amazon][US][price_vat_inclusive]"]', input.listPriceUsd);
      await page.keyboard.press("Tab");
      await settledPricing();
    },
    async "save-draft"() {
      ours();
      await settledPricing();
      await (await present("#save-announce")).click();
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      await open("pricing");
      await settledPricing();
      if (await tabStatus("Kindle eBook Pricing") === "Not Started") throw refusal("KDP did not save the pricing: its tab still says Not Started");
    },
    async publish() {
      await open("pricing");
      await settledPricing();
      await assist("Review this KDP title before it goes live. Click Done to publish it; close the browser to stop without publishing.");
      ours();
      await settledPricing();
      await page.locator("#save-and-publish-announce:visible").first().click();
      await page.waitForURL((url) => !TITLE_PATH.test(url.pathname), { timeout: 180_000 }).catch(async () => {
        const alerts = await page.locator(".a-alert-error:visible, .a-alert-warning:visible, .a-alert-inline-error:visible").allInnerTexts().catch(() => []);
        throw refusal(`KDP did not leave the pricing page after Publish${alerts.length ? `: ${alerts.join(" | ").replace(/\s+/gu, " ").slice(0, 600)}` : ""}`);
      });
    },
  };

  return Object.freeze({
    async run(step, input, { remoteIdentifier } = {}) {
      if (!Object.hasOwn(steps, step)) throw refusal(`unknown KDP step ${step}`);
      draft ??= remoteIdentifier ?? null;
      const result = await steps[step](input) ?? {};
      await mkdir(evidenceRoot, { recursive: true });
      const screenshot = join(evidenceRoot, `${step}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      return { ...result, evidence: evidence(screenshot, await readFile(screenshot), book, step, new Date().toISOString()) };
    },
    async close() {
      await writePrivateStorageState(config.storageState, await context.storageState()).catch(() => {});
      await close();
    },
  });
}
