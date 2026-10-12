# muse.561.group

The public site for **muse-assist**, the 561 Group's specialized MetroPlat
personal-agent application. **Muse** is Meta's product and a concrete
meet-then-beat reference, not the name of this application.

The site explains the whole personal-agent capability family: persistent
execution, tools and connected services, continuing goals, human authority,
knowledge, proactive work, and observable outcomes. Reference descriptions link
to Meta's product and technical accounts. Existing foundations, application
behavior, future work, and release status are distinguished.

HTML and CSS are both the source and served artifacts. The site needs no separate
assistant backend, generated content registry, or build framework. Application
code is in `../../apps/muse-assist`; this public site collects no personal data.

Preview from this directory:

```sh
python3 -m http.server 4317 --bind 127.0.0.1 --directory public
```

Open http://127.0.0.1:4317. The navigation and disclosure controls work without
JavaScript. `/guide.html` documents the development and architecture boundary.

`wrangler.jsonc` prepares Cloudflare static-assets hosting at `muse.561.group`,
following this repository's hosting carrier. In an authenticated environment,
`pnpm exec wrangler deploy --dry-run` checks the release; `pnpm deploy` publishes
and attaches the custom domain. No deployment has been performed by this work.

muse-assist is being prepared for open source, but release licensing is undecided.
Keep copy tied to demonstrated effects. Do not imply a published package, a
hosted assistant, complete integrations, or parity with the reference platform
before those exist.
