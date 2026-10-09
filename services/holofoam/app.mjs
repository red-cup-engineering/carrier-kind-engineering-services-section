import { applyEvent, createExperiment, decodeExperiment, encodeExperiment, loopCirculation, presetNames, resolvePolicy, step } from "./src/simulation.mjs";
import { createRenderer } from "./src/rendering.mjs";
import { operations } from "./src/operations.mjs";
import { recordCanvasWebm, saveCanvasPng } from "./src/capture.mjs";
import { checkpoint as makeCheckpoint, CHECKPOINT_KIND, LEGACY_CHECKPOINT_KIND, readingOf, restoreCheckpoint } from "./src/checkpoint.mjs";
import { renderForkComparison } from "./fork-view.mjs";
import { COMPARISON_KIND, compareField, reopenComparison } from "./src/comparison.mjs";

const canvas = document.querySelector("canvas");
const renderer = createRenderer(canvas);
const preset = document.querySelector("#preset");
const pause = document.querySelector("#pause");
const inspect = document.querySelector("#inspect");
const senses = document.querySelector("#senses");
const readout = document.querySelector("#readout");
const seed = Number(new URLSearchParams(location.search).get("seed"));
let world;
try {
  if (location.hash) {
    const encoded = location.hash.slice(1);
    const admitted = operations.admit.execute({ experiment: JSON.parse(atob(encoded)) });
    world = decodeExperiment(btoa(JSON.stringify(admitted.experiment)));
  } else world = createExperiment({ seed: Number.isInteger(seed) ? seed : 17 });
} catch { world = createExperiment(); location.hash = ""; }
let pointer = null;
const camera = { x: 0, y: 0, zoom: 1 };
let tool = "shove";
const undo = []; const redo = [];
const status = document.querySelector("#comparison");
const exportComparison = document.querySelector("#export-comparison");
let lastComparison = null;
function clearComparison() { lastComparison = null; exportComparison.disabled = true; status.textContent = ""; document.querySelector("#fork-view").replaceChildren(); }
function showStatus(message) { status.textContent = message; status.closest("details").open = true; }
function checkpoint() { undo.push(makeCheckpoint(world)); if (undo.length > 32) undo.shift(); redo.length = 0; }
function restore(value) { world = restoreCheckpoint(value); clearComparison(); syncControls(); }
function startNew(presetName) { world = createExperiment({ seed: world.seed, preset: presetName }); undo.length = 0; redo.length = 0; clearComparison(); syncControls(); }
function intervene(event) { checkpoint(); applyEvent(world, event); refreshEdges(); }

preset.replaceChildren(...presetNames().map((name) => new Option(name, name)));
function fit() { renderer.resize(); }
fit(); addEventListener("resize", fit);
function position(event) { const box = canvas.getBoundingClientRect(); const x = ((event.clientX - box.left) / box.width - .5) / camera.zoom + .5 + camera.x; const y = ((event.clientY - box.top) / box.height - .5) / camera.zoom + .5 + camera.y; return { x: x * world.width, y: y * world.height }; }
function fieldPosition(point) { return { x: ((point.x % world.width) + world.width) % world.width, y: ((point.y % world.height) + world.height) % world.height }; }
canvas.addEventListener("pointerdown", (event) => { pointer = position(event); const field = fieldPosition(pointer); checkpoint(); const nearest = world.organisms.reduce((best, organism) => Math.hypot(organism.x - field.x, organism.y - field.y) < Math.hypot(best.x - field.x, best.y - field.y) ? organism : best, world.organisms[0]); if (tool === "select") { applyEvent(world, { kind: "select", id: nearest.id }); refreshEdges(); } else if (tool === "barrier") applyEvent(world, { kind: "barrier", x: field.x, y: field.y, radius: .06, erase: event.shiftKey }); else if (tool !== "pan") applyEvent(world, { kind: "pulse", x: field.x, y: field.y, radius: .16, force: event.shiftKey ? -.009 : .009 }); canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", (event) => { if (pointer) { const p = position(event); if (tool === "pan") { camera.x += pointer.x - p.x; camera.y += pointer.y - p.y; } else if (tool !== "select") { const field = fieldPosition(p); applyEvent(world, tool === "barrier" ? { kind: "barrier", x: field.x, y: field.y, radius: .04, erase: event.shiftKey } : { kind: "pulse", x: field.x, y: field.y, radius: .16, force: event.shiftKey ? -.009 : .009 }); } pointer = p; } });
canvas.addEventListener("wheel", (event) => { event.preventDefault(); camera.zoom = Math.max(.5, Math.min(4, camera.zoom * (event.deltaY > 0 ? .9 : 1.1))); }, { passive: false });
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(name, () => { pointer = null; });
document.querySelector("#reset").onclick = () => startNew(preset.value);
pause.onclick = () => { world.paused = !world.paused; pause.textContent = world.paused ? "Play" : "Pause"; };
document.querySelector("#step").onclick = () => step(world, 1, { force: true });
preset.onchange = () => startNew(preset.value);
document.querySelectorAll("[data-rule]").forEach((input) => input.addEventListener("input", () => applyEvent(world, { kind: "rule", rule: input.dataset.rule, value: Number(input.value) })));
document.querySelector("#share").onclick = async () => { try { const encoded = encodeExperiment(world); const admitted = operations.admit.execute({ experiment: JSON.parse(atob(encoded)) }); const state = btoa(JSON.stringify(admitted.experiment)); await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${state}`); document.querySelector("#share").textContent = "Copied"; } catch (error) { showStatus(`Share refused: ${error.message}. Use Export for a checkpoint file.`); } };
function downloadJson(value, filename) { const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); anchor.download = filename; anchor.click(); URL.revokeObjectURL(anchor.href); }
document.querySelector("#export").onclick = () => downloadJson(makeCheckpoint(world), `holofoam-state-${world.tick}.json`);
exportComparison.onclick = () => { if (lastComparison) downloadJson(lastComparison.document, `holofoam-comparison-${lastComparison.document.input.checkpoint.tick}.json`); };
document.querySelector("#import").onchange = async (event) => {
  try {
    const parsed = JSON.parse(await event.target.files[0].text());
    if (parsed.kind === COMPARISON_KIND) {
      const comparison = reopenComparison(parsed);
      restore(comparison.document.input.checkpoint);
      world.paused = true; syncControls();
      showComparison(comparison);
    } else if (parsed.kind === CHECKPOINT_KIND || parsed.kind === LEGACY_CHECKPOINT_KIND) restore(parsed);
    else {
      const admitted = operations.admit.execute({ experiment: parsed });
      world = decodeExperiment(btoa(JSON.stringify(admitted.experiment)));
      clearComparison();
      showStatus("Experiment history imported and replayed."); syncControls();
    }
  } catch (error) { showStatus(`Import refused: ${error.message}`); }
  finally { event.target.value = ""; }
};
const dock = document.querySelector("#tools");
dock.innerHTML = '<button data-tool="select">Select</button><button data-tool="shove">Shove</button><button data-tool="barrier">Barrier</button><button data-tool="pan">Pan</button><button id="undo">Undo</button><button id="redo">Redo</button>';
const modelPanel = document.createElement("details");
modelPanel.innerHTML = '<summary>Lineage and saves</summary><div class="row"><button id="adopt">Adopt lineage</button><button data-edge="flow">Follow currents</button><button data-edge="signal">Follow signals</button><button data-edge="crowded">Avoid crowds</button><button data-edge="mixed">Avoid mixed company</button></div><div class="row"><label>Save name <input id="save-name" placeholder="save name"></label><button id="save">Save</button><label>Saved checkpoint <select id="saves"><option value="">Saved checkpoints</option></select></label><button id="load">Load</button></div>';
document.querySelector("#studio").append(modelPanel);
document.body.append(dock);
dock.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => { tool = button.dataset.tool; });
dock.querySelector("#undo").onclick = () => { if (undo.length) { redo.push(makeCheckpoint(world)); restore(undo.pop()); } };
dock.querySelector("#redo").onclick = () => { if (redo.length) { undo.push(makeCheckpoint(world)); restore(redo.pop()); } };
modelPanel.querySelector("#adopt").onclick = () => { const selected = world.organisms[world.selected ?? 0]; intervene({ kind: "adopt", id: selected.id, lineage: (selected.lineage + 1) % 3 }); };
function refreshEdges() { const selected = world.organisms[world.selected ?? 0]; const edges = world.genomes[selected.lineage].edges; modelPanel.querySelectorAll("[data-edge]").forEach((button) => { button.setAttribute("aria-pressed", String(edges[button.dataset.edge])); }); }
modelPanel.querySelectorAll("[data-edge]").forEach((button) => button.onclick = () => { const selected = world.organisms[world.selected ?? 0]; intervene({ kind: "mutate", lineage: selected.lineage, edge: button.dataset.edge }); refreshEdges(); });
refreshEdges();
const saveName = modelPanel.querySelector("#save-name"); const saves = modelPanel.querySelector("#saves");
function refreshSaves() { saves.replaceChildren(new Option("Saved checkpoints", ""), ...Object.keys(localStorage).filter((key) => key.startsWith("holofoam:")).sort().map((key) => new Option(key.slice(9), key))); }
refreshSaves();
modelPanel.querySelector("#save").onclick = () => { try { const name = saveName.value.trim(); if (name) { localStorage.setItem(`holofoam:${name}`, JSON.stringify(makeCheckpoint(world))); refreshSaves(); saves.value = `holofoam:${name}`; } } catch (error) { status.textContent = `Save failed: ${error.message}`; } };
modelPanel.querySelector("#load").onclick = () => { try { const saved = localStorage.getItem(saves.value); if (saved) restore(JSON.parse(saved)); } catch (error) { status.textContent = `Load refused: ${error.message}`; } };
document.querySelector("#capture").onclick = () => saveCanvasPng(canvas, `holofoam-${world.tick}.png`);
document.querySelector("#record").onclick = async () => { document.querySelector("#comparison").textContent = "Recording five seconds…"; await recordCanvasWebm(canvas, { filename: `holofoam-${world.tick}.webm`, onUnsupported: (message) => { document.querySelector("#comparison").textContent = message; } }); };
document.querySelector("#what-if").onclick = () => {
  const rule = document.querySelector("#what-rule").value;
  try { showComparison(compareField({ checkpoint: makeCheckpoint(world), count: 32, variationEvent: { kind: "rule", rule, value: Math.max(0, 1 - world.rules[rule]) } })); }
  catch (error) { showStatus(`Comparison refused: ${error.message}`); }
};
function showComparison(value) {
  const { document: { input }, result } = value;
  const start = readingOf(restoreCheckpoint(input.checkpoint));
  const { rule, value: target } = input.variationEvent;
  const selected = start.organisms[start.selected ?? 0];
  document.querySelector("#what-rule").value = rule;
  showStatus(`context: ${rule} ${start.rules[rule].toFixed(2)} → ${target.toFixed(2)}\nmodel: ${result.comparison.policyState} (${start.genomes[selected.lineage].id})\nticks: ${start.tick} → ${start.tick + input.count}\nprovenance: SignCraft history, forked at the checkpoint\naction changes: ${result.comparison.changedActionCount}\nmean displacement: ${result.comparison.meanDisplacement.toFixed(4)}`);
  renderForkComparison(document.querySelector("#fork-view"), result, selected.id);
  lastComparison = value; exportComparison.disabled = false;
}
function syncControls() { preset.value = world.preset; pause.textContent = world.paused ? "Play" : "Pause"; document.querySelectorAll("[data-rule]").forEach((input) => { input.value = world.rules[input.dataset.rule]; }); refreshEdges(); }
function draw() {
  renderer.draw(world, { inspect: inspect.checked, senses: senses.checked, camera });
  const selected = world.organisms[world.selected ?? 0];
  const circulation = loopCirculation(world, .5, .5);
  const crowding = typeof selected.model.crowding === "object" ? `same ${selected.model.crowding.same}, other ${selected.model.crowding.other}` : selected.model.crowding;
  const witness = selected.model.witnesses.at(-1);
  const policy = resolvePolicy(selected.model, world.compiledModels[selected.lineage]);
  readout.textContent = `organism ${selected.id} · lineage ${selected.lineage}\naction: ${selected.model.action}\nobserved: flow ${selected.model.favorableFlow}, signal ${selected.model.signal}, ${crowding}\npolicy: for ${policy?.values.includes("approach-for") ? "yes" : "no"} · against ${policy?.values.includes("approach-against") ? "yes" : "no"}\nlatest witness ${witness ? `t${witness.tick}` : "none"} · local circulation ${circulation.toFixed(4)}`;
  step(world); requestAnimationFrame(draw);
}
syncControls();
draw();
