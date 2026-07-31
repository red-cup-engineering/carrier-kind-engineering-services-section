import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "meme-topology",
      description: "Documentation for the meme-topology package.",
      sidebar: [
        {
          label: "Documentation",
          items: [
            { label: "Overview", slug: "index" },
            { label: "Getting Started", slug: "getting-started" }
          ]
        },
        {
          label: "API Reference",
          items: [{ autogenerate: { directory: "api" } }]
        }
      ]
    })
  ]
});
