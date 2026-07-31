import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({
    loader: glob({
      base: new URL("../../../docs/", import.meta.url),
      pattern: ["*.{md,mdx}", "api/**/*.{md,mdx}"]
    }),
    schema: docsSchema()
  })
};
