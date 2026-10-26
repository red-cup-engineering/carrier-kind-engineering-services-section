# @561-group/divination-codecs

Coders/decoders for divination representations. Zero runtime dependencies:
a codec is a geometric morphism between representations and carries nothing
but its wire format — the record types here are structural, and the
`divination-topology` carrier satisfies them without being imported.

- **glyph** — the standard astrological shorthand: `☽ 2°07′ ♉`, with ` ℞`
  for retrogradation. `encodeGlyphPlacement`/`decodeGlyphPlacement`
  round-trip body, longitude (to the arcminute — the notation's
  resolution), and motion; `renderChartGlyphs` projects a whole chart.
  The body and sign glyph tables are the notation's own standard and live
  here.
- **spread** — the tarot spread document the polity's
  `encoding-a-tarot-spread` skill writes: a `---`-fenced YAML head (spread,
  date, provenance with method and optional seed, block list of
  position/card/orientation) over an interpretation body. The card NAME is
  the wire form; the deck's naming standard (22 majors, "Rank of Suit"
  minors) is this codec's own table. Laws: decode(encode(doc)) = doc.
- **indicators** — the daily-indicators JSON document a diviner cycle's
  first stage writes and second stage reads, with `assertDailyIndicators`
  validation (TypeError is the only throw) and `renderIndicatorsBrief`,
  the deterministic markdown projection a synthesizer or reviewing human
  reads.
