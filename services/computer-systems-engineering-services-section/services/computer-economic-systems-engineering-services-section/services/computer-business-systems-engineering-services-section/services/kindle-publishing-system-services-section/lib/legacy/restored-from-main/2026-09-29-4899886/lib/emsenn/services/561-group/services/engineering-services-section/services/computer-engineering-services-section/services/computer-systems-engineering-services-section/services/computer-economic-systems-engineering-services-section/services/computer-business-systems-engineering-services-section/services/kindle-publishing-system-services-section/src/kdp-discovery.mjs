import { writeFile } from "node:fs/promises";
import { DEFAULT_KDP_STORAGE_STATE_PATH, awaitKdpSignIn, writePrivateStorageState } from "./kdp-session.mjs";

/**
 * Describe the form controls a page offers: tag, type, id, name, class, label,
 * visible option texts and visibility. It never reads a control's value.
 * Runs in the page.
 */
function describeControls() {
  const label = (element) => {
    if (element.id) { const labelled = document.querySelector(`label[for="${CSS.escape(element.id)}"]`); if (labelled) return labelled.innerText.trim().slice(0, 120); }
    const wrapping = element.closest("label"); if (wrapping) return wrapping.innerText.trim().slice(0, 120);
    const described = element.getAttribute("aria-labelledby"); if (described) return described.split(/\s+/u).map((id) => document.getElementById(id)?.innerText.trim() ?? "").join(" ").slice(0, 120);
    return (element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").slice(0, 120);
  };
  const section = (element) => element.closest("fieldset, section, [data-a-expander-name], .a-section")?.querySelector("legend, h2, h3, h4, .a-form-label")?.innerText.trim().slice(0, 120) ?? null;
  const controls = [...document.querySelectorAll("input, select, textarea, button, [role=button], [role=radio], [role=checkbox], [contenteditable=true], iframe")]
    .filter((element) => element.type !== "hidden")
    .map((element) => ({
      tag: element.tagName.toLowerCase(), type: element.type || element.getAttribute("role") || null, id: element.id || null, name: element.name || null,
      testId: element.getAttribute("data-testid") || element.getAttribute("data-action") || null,
      cls: typeof element.className === "string" ? element.className.slice(0, 100) : null,
      label: label(element), section: section(element),
      text: ["BUTTON", "A"].includes(element.tagName) || element.getAttribute("role") === "button" ? element.innerText.trim().slice(0, 80) : null,
      options: element.tagName === "SELECT" ? [...element.options].map((option) => `${option.value}=${option.text.trim()}`).slice(0, 60) : null,
      visible: Boolean(element.offsetWidth || element.offsetHeight),
    }));
  const headings = [...document.querySelectorAll("h1, h2, h3, h4, legend, .a-form-label")].map((heading) => heading.innerText.trim().slice(0, 160)).filter(Boolean).slice(0, 200);
  return { controls, headings };
}

/**
 * Read-only discovery of KDP's title-setup forms in a browser a person
 * supervises. It loads each page, waits while the person completes any
 * sign-in or challenge, and records only form-control descriptors. It clicks
 * nothing and saves nothing on KDP; it refreshes the saved session afterwards.
 */
export async function discoverKdpForms({ pages, out, storageStatePath = DEFAULT_KDP_STORAGE_STATE_PATH, humanWaitMs = 10 * 60_000 }, capabilities = {}) {
  const { chromium } = capabilities.playwright ?? await import("playwright");
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    const observed = {};
    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await awaitKdpSignIn(page, url, { humanWaitMs });
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      observed[url] = { finalUrl: page.url().replace(/[?#].*$/u, ""), ...await page.evaluate(describeControls) };
      process.stderr.write(`${url}: ${observed[url].controls.length} controls\n`);
    }
    await writePrivateStorageState(storageStatePath, await context.storageState());
    await writeFile(out, `${JSON.stringify(observed, null, 1)}\n`, { mode: 0o600 });
    return Object.freeze({ out, pages: Object.keys(observed).length });
  } finally {
    await browser.close();
  }
}
