# html-services-section (file format)

This is the **serialization-services-section** `html-services-section`: the canonical serialization boundary for HTML, home to `services/html-file-codec-service` and its Semantic Hypertext Packet (SHP) codec, lint, and escaping surface. It reads and writes HTML files; it does not render documents from data.

A different `html-services-section` exists at `web-services-section/services/html-services-section` — the web-tier rendering seat, home to `html-document-render-service` (carrier + CSS in, HTML document string out). If you are producing styled HTML from data rather than decoding or encoding an HTML file, that is the section you want.
