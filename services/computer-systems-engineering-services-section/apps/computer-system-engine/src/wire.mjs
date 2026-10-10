/**
 * codecs/boundary/wire - the argv-selectable wire vocabulary, derived from
 * concrete representation projectors.
 *
 * A `WireCodec` adapts one boundary document (a string on stdin/stdout) to the
 * carrier an action's morphism consumes and produces. The wire is NOT forced:
 * the articulation family defaults to `string` (a Mark payload is opaque), and
 * everything passed between scripts defaults to `json`; `--input-format`/`--output-format`
 * select a codec by name. EAVT is offered as a wire too, but it is primarily the
 * shape of the LOG, not the wire.
 *
 * Each wire is the boundary face of a holography `Projector<JsonValue>`:
 * `stringProjector`/`senProjector` stay in writing, while JSON/EAVT/SVG
 * projectors come from their codec leaves. `wireOf(projector)` is the adapter:
 * `decode = read`,
 * `encode = write`, `mediaType` from a corner-tagged table, and the projector's
 * content `corner` ⟨addressability, assertivity⟩ and completion `rung` are
 * inherited. The wire therefore carries the decidability invariant for free — a
 * `transfinite-bounded` or `aperiodic` `read` can never become a wire, because `wireOf` rejects
 * any projector whose `read` is not decidable. An unknown name is rejected (a
 * finite vocabulary, witnessed).
 *
 * The SEN wire (`application/sen+json`) is admitted here: `senProjector` is corner
 * `assertion`, rung `scott`, so a closed, well-typed SEN body may travel as the
 * wire, inspected and replayed rather than hidden behind the endpoint. The wire
 * layer inherits the SEN admission boundary; it does not make arbitrary host code
 * safe to read.
 */
import { canonical, parse as parseJson } from "@red-cup-engineering/json-services-section";
import { jsonProjector } from "@red-cup-engineering/computer-content-engineering-services-section/json-projector";
import { eavtProjector, parse as parseEavt, serialize as serializeEavt } from "@red-cup-engineering/eavt-services-section/row";
import { svgProjector } from "@red-cup-engineering/signgraph/diagram-svg";
import { mermaidProjector, umlProjector, plantUmlProjector } from "@red-cup-engineering/signgraph/diagram";
import { senProjector } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/projector";
import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
import {
  cornerOf,
  rungOf,
  readIsDecidable,
  define,

} from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";


/** A wire codec: decode a boundary document into a carrier, encode it back. It is
 *  the boundary face of one `writing` projector, so it inherits that projector's
 *  content `corner` and completion `rung` and the decidability invariant. */

                                                             

/** The media type each wire serves, keyed by projector `type`. The wire byte
 *  form is identical to the prior hand-rolled vocabulary; the corner/rung now ride
 *  along from the projector. */
const WIRE_MEDIA_TYPES                                   = Object.freeze({
  string: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  eavt: "application/eavt+jsonl; charset=utf-8",
  form: "application/x-www-form-urlencoded; charset=utf-8",
  sen: "application/sen+json; charset=utf-8",
  svg: "image/svg+xml; charset=utf-8",
  mermaid: "text/vnd.mermaid; charset=utf-8",
  xmi: "application/xmi+xml; charset=utf-8",
  plantuml: "text/x-plantuml; charset=utf-8",
});

/** Adapt one graded `writing` projector into an argv-selectable wire codec.
 *
 *  `decode` reads the boundary document into a single carrier value; `encode`
 *  writes a carrier value back to a document. The projector's content `corner` and
 *  completion `rung` are inherited, and the decidability invariant is enforced
 *  HERE: a projector whose `read` settles at a transfinite-bounded or aperiodic rung is not
 *  admissible as a wire (you would be depending on an undecidable completion to
 *  cross the boundary). A `name`/`mediaType`/`decode`/`encode` override lets a wire
 *  pin its exact byte form (e.g. EAVT normalizes rows; `string` canonicalizes a
 *  non-string) while still inheriting the grading from its projector. */
export function wireOf(
  projector                      ,
  overrides

    = {},
)            {
  if (!readIsDecidable(projector)) {
    throw new TypeError(
      `wireOf(${projector.type}): read settles at the ${rungOf(projector)} rung, which is not decidable; ` +
        `a wire may not depend on an undecidable completion`,
    );
  }
  const name = overrides.name ?? projector.type;
  const mediaType = overrides.mediaType ?? WIRE_MEDIA_TYPES[name] ?? "application/octet-stream";
  const read = projector.read;
  const write = projector.write;
  const decode =
    overrides.decode ??
    ((document        )            => {
      if (read === undefined) throw new TypeError(`wire ${name}: projector ${projector.type} has no read`);
      const items = read({ path: "", content: document });
      return (items.length === 0 ? null : items[0])             ;
    });
  const encode =
    overrides.encode ??
    ((value           )         => {
      if (write === undefined) throw new TypeError(`wire ${name}: projector ${projector.type} has no write`);
      return write([value]);
    });
  return Object.freeze({ name, mediaType, corner: cornerOf(projector), rung: rungOf(projector), decode, encode });
}

/** The plain-string wire: identity on the boundary document (corner `bottom`). A
 *  non-string carrier is canonicalized so structured values still cross verbatim. */
export const stringCodec            = wireOf(stringProjector, {
  encode: (value           )         => (typeof value === "string" ? value : canonical(value)),
});

/** The JSON wire: the canonical resource form passed between scripts (corner `data`). */
export const jsonCodec            = wireOf(jsonProjector, {
  decode: (document        )            => parseJson(document),
  encode: (value           )         => `${canonical(value)}\n`,
});

/** The EAVT wire: the carrier is the array of witnessed records (corner `assertion`). */
export const eavtCodec            = wireOf(eavtProjector, {
  decode: (document        )            => parseEavt(document)                        ,
  encode: (value           )         =>
    serializeEavt((Array.isArray(value) ? value : [value])                                    ),
});

/** The SEN wire: an admitted SEN morphism body as `application/sen+json` (corner
 *  `assertion`, rung `scott`). The term IS JSON, so the wire shares JSON's
 *  read/write; admitting it lets an SEN-bodied action travel as the wire — the
 *  request or response carries the morphism itself. */
export const senCodec            = wireOf(senProjector, {
  decode: (document        )            => parseJson(document),
  encode: (value           )         => `${canonical(value)}\n`,
});

/** The SVG wire: a geometric realization of the presented-category diagram carrier. */
export const svgCodec            = wireOf(svgProjector                        , {
  name: "svg",
  mediaType: "image/svg+xml; charset=utf-8",
});

/** The Mermaid wire: a textual presentation of the presented-category diagram carrier. */
export const mermaidCodec            = wireOf(mermaidProjector                                   , {
  name: "mermaid",
  mediaType: "text/vnd.mermaid; charset=utf-8",
});

/** The XMI wire: the structural UML metamodel view of the same diagram carrier. */
export const xmiCodec            = wireOf(umlProjector                                   , {
  name: "xmi",
  mediaType: "application/xmi+xml; charset=utf-8",
});

/** The PlantUML wire: the textual UML view of the same diagram carrier. */
export const plantUmlCodec            = wireOf(plantUmlProjector                                   , {
  name: "plantuml",
  mediaType: "text/x-plantuml; charset=utf-8",
});

/** The form projector: `application/x-www-form-urlencoded` as a graded boundary —
 *  a `data` corner (addressable record, non-asserting) at the `strict` rung. This
 *  is the encoding behind an HTTP query string and a web form (another
 *  representation of a record carrier, e.g. `token=foo&claim=bar` ↔ {token,claim}),
 *  not a second ontology. It is `define`d here because the form encoding is a
 *  boundary-form concern (it carries no `writing`-catalog peer); deriving its
 *  wire through `wireOf` keeps it graded like every other wire. */
const formProjector                       = define           ({
  type: "form",
  corner: "data",
  rung: "strict",
  recognize: () => true,
  read: (resource) => {
    const out                               = {};
    for (const [key, value] of new URLSearchParams(resource.content)) out[key] = value;
    return [out];
  },
  write: (items) => {
    const value = items[0];
    if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("form codec: can only encode a flat object");
    }
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(value)) {
      params.set(key, typeof item === "string" ? item : canonical(item));
    }
    return `${params.toString()}\n`;
  },
});

/** The form wire: repeated keys keep the last value; nesting is not a form concern
 *  (compose with `json` for structure). */
export const formCodec            = wireOf(formProjector);

const REGISTRY                                      = Object.freeze({
  string: stringCodec,
  json: jsonCodec,
  eavt: eavtCodec,
  form: formCodec,
  mermaid: mermaidCodec,
  plantuml: plantUmlCodec,
  sen: senCodec,
  svg: svgCodec,
  xmi: xmiCodec,
});

/** The available wire codec names — the finite vocabulary. */
export const WIRE_CODEC_NAMES                    = Object.freeze(Object.keys(REGISTRY).sort());

/** Resolve a wire codec by name, or throw — the vocabulary witness. */
export function wireCodec(name        )            {
  const codec = REGISTRY[name];
  if (codec === undefined) {
    throw new TypeError(`unknown wire codec ${JSON.stringify(name)}; known: ${WIRE_CODEC_NAMES.join(", ")}`);
  }
  return codec;
}

/** The wire codec whose media type matches, or undefined — the inverse of
 *  `wireCodec(name).mediaType`. The media-type comparison ignores parameters
 *  (charset), so `application/json` matches the `json` wire. */
export function wireByMediaType(mediaType        )                        {
  const base = mediaType.split(";")[0]?.trim().toLowerCase() ?? "";
  for (const name of WIRE_CODEC_NAMES) {
    const codec = REGISTRY[name]             ;
    if ((codec.mediaType.split(";")[0]?.trim().toLowerCase() ?? "") === base) return codec;
  }
  return undefined;
}
