# Holofoam

Holofoam means **Holographic Organisms Localized On Field Of Agent Models**.
It is a replayable browser laboratory at <https://holofoam.561.group>.

Each organism observes a bounded local neighborhood, keeps a short
time-indexed witness history, and selects an action from a finite lineage
policy table. Metrologic's directed finite closure compiles every sensory
signature into separate `approach-for` and `approach-against` recommendations.
Both recommendations produce `inspect`; support only produces `approach`;
opposition only produces `avoid`; neither produces `explore`. Unknown sensors
remain visible in the organism inspector but do not erase other observed cues.

World transport controls change the field that organisms sense. Genome edge
edits change a selected lineage's compiled table and model identity. Adoption,
mutation, and barriers are replay events. Signals and motion are deterministic
state transitions reconstructed from the admitted event history. The same
headless engine drives the browser and the public operations export.

The studio includes field tools, pause and forced single-step, undo/redo,
named local saves, replay links, JSON import/export, PNG capture, WebM capture
where supported, local-senses rendering, and a same-genome What-if comparison.
That comparison starts two identical current-state checkpoints, holds the
lineage table fixed, changes one field control, and compares a bounded future
continuation. A checkpoint is explicitly labeled unverified-current-state: it
does not claim to re-verify the full seed history.

After What if?, Export comparison downloads the starting checkpoint, field
intervention, and continuation length as a `holofoam.field-comparison/v1`
document. Import experiment reruns that bounded comparison and pauses at its
starting state. It works in a fresh browser without local saves. World Export
still saves the current world; Share replay still refers to seed history.
Headless readers use `./comparison`'s `reopenComparison(document)` to obtain
both future checkpoints and the comparison, computed from the saved inputs.

Holofoam is a finite artificial-life experiment. It does not claim a proof of
autopoiesis, a biological model, global cohomology, or Fluoddity-scale GPU
simulation. Its circulation display is finite midpoint quadrature over the
app field. Browser capture depends on standard canvas and MediaRecorder
support.

The measured product baseline is [data/records/competitive-baseline.json](data/records/competitive-baseline.json).
The finite directed closure and local circulation framing follow the repository
sources `TarskiSheafClosure.lean` and `VortexCohomology.lean`; this browser
runtime is an implementation experiment, not a replacement proof.
