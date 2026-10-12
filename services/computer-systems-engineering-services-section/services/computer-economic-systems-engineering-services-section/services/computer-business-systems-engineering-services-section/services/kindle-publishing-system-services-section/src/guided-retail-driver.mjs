import { mkdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { webAccount, writePrivateStorageState } from "@red-cup-engineering/assisted-browser-services-section/accounts";
import { stepGuide } from "@red-cup-engineering/assisted-browser-services-section/assist";
import { openHeadless, openWindow } from "@red-cup-engineering/assisted-browser-services-section/window";

/**
 * The live receiver for a portal whose forms no discovery has mapped: the
 * person at a visible browser does each step by hand, and the code keeps the
 * submission exact. A panel over the portal shows the step, the listing's
 * values for it (each with a Copy button) and Done or Stop. On an upload step
 * any file chooser the portal opens is answered with the step's accepted
 * file, so the bytes sent are the bytes the gate admitted. Each Done is
 * evidenced by a screenshot of the page it was clicked on.
 *
 * An irreversible step (publishing, a permanent identifier) is the person's
 * click in the portal; the panel says so. Stop, or closing the browser, ends
 * the run as the person withholding it, and a later run resumes at that step.
 *
 * `identify(url)` reads the portal's title id from a page address. Once a step
 * has named a title, a step done on another title is refused, so work never
 * lands on a title this submission did not create.
 */

export const PERSON_STOPPED = "reserved-authority-person-stopped";

function refusal(message, code = "GUIDED_STEP_REFUSED") { const error = new Error(message); error.code = code; return error; }
const heading = (key) => key.replace(/([a-z])([A-Z])/gu, "$1 $2").replace(/^./u, (first) => first.toUpperCase());

/** A step input as the rows the person copies from: nested answers and lists flattened, empty values left out. */
export function guideValues(input, prefix = "") {
  const rows = [];
  for (const [key, value] of Object.entries(input ?? {})) {
    const label = `${prefix}${heading(key)}`;
    if (key === "path" || value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((item, index) => rows.push(...(typeof item === "object" ? guideValues(item, `${label} ${index + 1}: `) : [{ label: value.length > 1 ? `${label} ${index + 1}` : label, value: String(item) }])));
    else if (typeof value === "object") rows.push(...guideValues(value, `${label}: `));
    else rows.push({ label, value: String(value) });
  }
  return rows;
}

function stepText(name, step, told, input) {
  if (!told) throw refusal(`${name} has no guide for step ${step}`);
  return [
    `${name}, ${step}: ${typeof told.say === "function" ? told.say(input) : told.say}`,
    ...(input.path ? [`The file chooser is answered with ${basename(input.path)} for you.`] : []),
    told.irreversible ? "This step cannot be undone, so it is yours to click in the portal. Click Done once the portal confirms it; Stop leaves it undone." : "Click Done when the page is saved.",
  ].join(" ");
}
const stepValues = (input) => [...(input.path ? [{ label: "File", value: basename(input.path) }] : []), ...guideValues(input)];

/**
 * `guide` maps each step to `{ say, irreversible? }`, where `say` is the
 * instruction, or a function of the step input that returns it.
 */
export function guidedRetailDriver({ retailer, name, guide, identify = () => null }) {
  return async function liveGuidedDriver({ config, evidenceRoot, book, evidence }, capabilities = {}) {
    const { context, page, close } = await openWindow({ storageState: config.storageState }, capabilities);
    await page.goto(config.start ?? webAccount(retailer).start, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const steps = await stepGuide(context, { notify: capabilities.notify });
    // Listening for file choosers replaces the system dialog, so listen only while an upload step is shown.
    let file = null;
    const answer = (chooser) => { if (file) chooser.setFiles(file).catch(() => {}); };
    context.on("page", (opened) => { if (file) opened.on("filechooser", answer); });
    let title = null;

    return Object.freeze({
      async run(step, input, { remoteIdentifier } = {}) {
        const text = stepText(name, step, guide[step], input);
        title ??= remoteIdentifier ?? null;
        file = input.path ?? null;
        if (file) for (const open of context.pages()) open.on("filechooser", answer);
        let choice;
        try { choice = await steps.show(text, { values: stepValues(input), labels: ["Done", "Stop"] }); }
        catch (error) { if (error?.code === "ASSIST_CLOSED") return { needsHuman: true, reason: PERSON_STOPPED }; throw error; }
        finally { if (file) for (const open of context.pages()) open.off("filechooser", answer); file = null; }
        if (choice.label === "Stop") return { needsHuman: true, reason: PERSON_STOPPED };
        const found = identify(choice.page.url());
        if (title && found && found !== title) throw refusal(`${name} ${step} was done on title ${found}, not ${title}, the title this submission created`, "GUIDED_FOREIGN_TITLE");
        title ??= found;
        await choice.page.evaluate(() => document.getElementById("house-steps")?.remove()).catch(() => {});
        await mkdir(evidenceRoot, { recursive: true });
        const screenshot = join(evidenceRoot, `${step}.png`);
        await choice.page.screenshot({ path: screenshot, fullPage: true });
        return { evidence: evidence(screenshot, await readFile(screenshot), book, step, new Date().toISOString()), ...(found ? { remoteIdentifier: found } : {}) };
      },
      async close() {
        await context.storageState().then((state) => writePrivateStorageState(config.storageState, state)).catch(() => {});
        await close().catch(() => {});
      },
    });
  };
}

/**
 * A guided channel's dry run: each step's panel, as the person would see it,
 * over a blank page in a headless browser. It is screenshotted as the step's
 * evidence and answered Done. No portal is opened.
 */
export function guidedRehearsalDriver({ name, guide }) {
  return async function rehearsalDriver({ evidenceRoot, book, evidence }, capabilities = {}) {
    const { context, page, close } = await openHeadless({}, capabilities);
    await page.setContent(`<!doctype html><title>${name} rehearsal</title><body style="font:16px system-ui,sans-serif;padding:40px;color:#243b53"><h1>${name}</h1><p>Rehearsal: the portal would be here.</p></body>`);
    const steps = await stepGuide(context, { notify: capabilities.notify ?? (() => {}) });
    return Object.freeze({
      async run(step, input) {
        const shown = steps.show(stepText(name, step, guide[step], input), { values: stepValues(input), labels: ["Done", "Stop"] });
        const done = page.locator("#house-steps").getByRole("button", { name: "Done", exact: true });
        await done.waitFor({ state: "visible", timeout: 10_000 });
        await mkdir(evidenceRoot, { recursive: true });
        const screenshot = join(evidenceRoot, `${step}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        await done.click();
        await shown;
        await page.evaluate(() => document.getElementById("house-steps")?.remove());
        return { evidence: evidence(screenshot, await readFile(screenshot), book, step, new Date().toISOString()) };
      },
      close,
    });
  };
}
