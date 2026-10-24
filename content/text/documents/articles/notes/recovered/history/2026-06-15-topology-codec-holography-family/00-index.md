# Topology, codec and holography package family (June 2026), as received

Authored index. Each directory beside this file holds byte copies of the
documentation, manifests and data that remained in the legacy tree for one
package of the June 2026 `lib/*-topology`, `*-codecs` and `*-holography` family
(and `services/web-tics`), received on 2026-10-24. `.gitignore` files (build
output and `node_modules` patterns; `agent-swarm-algebra` retained nothing else)
are not received.

Shape of the family: a *topology* package states a domain as mathematics
(a carrier, finite maps, quotients, charges) over the meme-topology floor; a
*codec* package is pure value translation between a wire representation and
frozen records (no I/O, no clock, `TypeError` for malformed shapes only, zero
runtime dependencies, "codec law L4"); a *holography* package projects records
from one topology into another. Tests were stated as falsifiable theorems and
all I/O entered as values.

Status: documentation of packages whose TypeScript sources are not living code.
Of this family only the ephemeris half has a living counterpart:
`computer-systems-engineering-services-section/services/computer-simulation-system-services-section/services/astronomy-position-computation-service`
computes bounded sky measurements from an embedded ephemeris (1800-2050) and
leaves zodiacal signs, houses and aspect meaning to Divination. Calendar and
computus mathematics, liturgical calendars and lectionary tables, tarot and
numerology carriers, the astrological glyph and spread codecs, the PNG/JPEG/GIF/
WebP header codec, the Search Console demand codec and the propaganda and
content topologies have no located living implementation. Their sources remain
in Group Git history (commit `0c903f4d611` added the retained files; the
`src/` trees that existed were removed from the legacy tree in `e4d67a2f38f`
and earlier retirement commits). Revive a capability from that history and
express it in the current contract; do not restore the package boundaries by
default.

| directory | package | files received |
|---|---|---|
| `astrology-topology` | `@561-group/astrology-topology` | README.md |
| `astrology-topology-experimental` | `@561-group/astrology-topology-experimental` | README.md |
| `calendar-topology` | `@561-group/calendar-topology` | README.md |
| `claude-code-cli-harness-topology` | `@emsenn/claude-code-cli-harness-topology` | package.json |
| `claude-code-topology` | `@emsenn/claude-code-topology` | package.json |
| `claude-topology` | @emsenn/claude-topology (inferred from its dependents) | governance/assignments.json, governance/offices.json, roles/default.json |
| `content-codecs` | `@561-group/content-codecs` | README.md, package.json |
| `content-topology` | `@561-group/content-topology` | CLAUDE.md, README.md |
| `decision-topology` | `@emsenn/decision-topology` | package.json |
| `divination-codecs` | `@561-group/divination-codecs` | README.md |
| `divination-topology` | `@561-group/divination-topology` | README.md |
| `image-codecs` | `@561-group/image-codecs` | README.md |
| `liturgy-topology` | `@561-group/liturgy-topology` | README.md |
| `llm-topology` | `@emsenn/llm-topology` | CLAUDE.md, README.md |
| `meme-editor-environment-topology` | `@emsenn/meme-editor-environment-topology` | package.json |
| `propaganda-topology` | `@561-group/propaganda-topology` | README.md |
| `syndication-holography` | `@561-group/syndication-holography` | package.json |
| `web-codecs-multipart` | `@emsenn/web-codecs-multipart` | package.json |
| `web-tics` | `@emsenn/web-tics` | package.json |
| `web-topology` | `@emsenn/web-topology` | CLAUDE.md, package.json |

