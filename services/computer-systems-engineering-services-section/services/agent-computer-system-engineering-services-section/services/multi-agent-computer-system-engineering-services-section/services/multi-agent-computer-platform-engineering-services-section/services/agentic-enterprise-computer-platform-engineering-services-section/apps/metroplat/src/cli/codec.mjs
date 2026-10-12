

export function cliHelpRequested(args) {
  return args.length === 0 || args.includes("--help") || args.includes("-h");
}

function schemaSummary(schema) {
  if (schema === undefined) return "-";
  const title = schema["title"];
  if (typeof title === "string" && title.length > 0) return title;
  const id = schema["$id"];
  if (typeof id === "string" && id.length > 0) return id;
  const type = schema["type"];
  if (typeof type === "string" && type.length > 0) return type;
  return "schema";
}

export function cliHelpText(discovery) {
  const rows = discovery.programs
    .map((program) => ({
      name: program.name,
      summary: program.summary ?? program.description ?? "",
      input: schemaSummary(program.domainSchema),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const width = Math.max("name".length, ...rows.map((row) => row.name.length));
  return [
    `${discovery.package} commands`,
    "",
    `usage: metroplat <verb> [json on stdin]`,
    "",
    ...rows.map((row) => `${row.name.padEnd(width)}  ${row.summary}${row.input === "-" ? "" : `  input: ${row.input}`}`),
    "",
  ].join("\n");
}
