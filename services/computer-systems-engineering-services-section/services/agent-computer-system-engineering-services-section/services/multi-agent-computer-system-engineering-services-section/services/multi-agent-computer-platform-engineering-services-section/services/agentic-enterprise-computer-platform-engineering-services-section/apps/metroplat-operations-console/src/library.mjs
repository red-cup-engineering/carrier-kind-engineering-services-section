// The Group's library on ops: the published editions of its books (a fabricated edition's PDF and
// EPUB, under the MetroPlat data root's data/state/editions/<slug>/), for anyone signed in. The
// world names each book in its section's room; this is where its printed edition is fetched.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";

const TYPES = Object.freeze({ pdf: "application/pdf", epub: "application/epub+zip" });

/** The editions a data root holds: each slug with the formats present. */
export function libraryEditions(dataRoot) {
  const dir = join(dataRoot, "data", "state", "editions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => ({
    slug: entry.name,
    formats: Object.keys(TYPES).filter((format) => existsSync(join(dir, entry.name, `${entry.name}.${format}`))),
  }));
}

/** @param {{ dataRoot: string }} options */
export function libraryApp({ dataRoot }) {
  return { resources: [
    { id: "ops-library", match: "/library", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr({ editions: libraryEditions(dataRoot) }, { cacheControl: { noStore: true } }) },
    {
      id: "ops-library.edition",
      match: (path) => {
        const found = /^\/library\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(pdf|epub)$/u.exec(path);
        return found ? { slug: found[1], format: found[2] } : false;
      },
      methods: ["GET"],
      handler: (ctx) => {
        const { slug, format } = ctx.params;
        const file = join(dataRoot, "data", "state", "editions", slug, `${slug}.${format}`);
        if (!existsSync(file)) return jsonRepr({ error: "not_found", reason: `no ${format} edition of ${slug}` }, { status: 404, cacheControl: { noStore: true } });
        return { status: 200, type: TYPES[format], body: readFileSync(file), headers: { "content-disposition": `inline; filename="${slug}.${format}"` }, cacheControl: { noStore: true } };
      },
    },
  ] };
}
