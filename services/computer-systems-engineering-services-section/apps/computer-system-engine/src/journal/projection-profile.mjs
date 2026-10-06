export const diskProjectionProfile = Object.freeze({
  kind: "metroplat.runtime.project.profile",
  id: "metroplat.runtime.project.profile.recorded-disk",
  description: "The shipped deterministic cache profile from recorded source rows to outward artifacts.",
  legs: Object.freeze([
    Object.freeze({ act: "admit", source: "journal", artifact: "source-log", extension: "jsonl" }),
    Object.freeze({ act: "settle", source: "journal", artifact: "standing-snapshot", extension: "json" }),
    Object.freeze({ act: "commit", source: "standing", artifact: "record-ledger", extension: "jsonl" }),
    Object.freeze({ act: "realize", source: "record", artifact: "content-document", extension: "json" }),
  ]),
});

