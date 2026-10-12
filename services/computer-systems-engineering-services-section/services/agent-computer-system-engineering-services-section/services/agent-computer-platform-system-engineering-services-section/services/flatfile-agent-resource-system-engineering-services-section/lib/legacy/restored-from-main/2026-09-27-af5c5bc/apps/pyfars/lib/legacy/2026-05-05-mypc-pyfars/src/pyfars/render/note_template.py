"""Generate a scaffold (frontmatter + body skeleton) for a new note.

Frontmatter carries the canonical fields for the kind. Body holds the
rubric H2 sections that ``score.rubric_coverage`` checks for —
encouraging notes to be filled in along that shape from the start.

The slug is *not* embedded in frontmatter (the file's stem is canonical).
``component-of`` is filled if the caller supplies a parent domain.
"""
from __future__ import annotations

from pyfars.render.fm_dump import dump

# Frontmatter scaffolds per kind. Order is preserved by ``fm_dump``.
_FM_TEMPLATES: dict[str, dict] = {
    "concept": {
        "title": "",
        "kind": "concept",
        "description": "",
        "depends-on": [],
        "see-also": [],
        "references": [],
    },
    "definition": {
        "title": "",
        "kind": "definition",
        "description": "",
        "realizes": [],
        "depends-on": [],
        "references": [],
    },
    "morphism": {
        "title": "",
        "kind": "morphism",
        "description": "",
        "realizes": [],
        "depends-on": [],
        "references": [],
    },
    "theorem": {
        "title": "",
        "kind": "theorem",
        "status": "draft",
        "depends-on": [],
        "references": [],
    },
    "lemma": {
        "title": "",
        "kind": "lemma",
        "status": "draft",
        "depends-on": [],
        "references": [],
    },
    "proposition": {
        "title": "",
        "kind": "proposition",
        "status": "draft",
        "depends-on": [],
        "references": [],
    },
    "corollary": {
        "title": "",
        "kind": "corollary",
        "status": "draft",
        "depends-on": [],
        "references": [],
    },
    "example": {
        "title": "",
        "kind": "example",
        "instantiates": [],
        "depends-on": [],
        "references": [],
    },
    "narrative": {
        "title": "",
        "kind": "narrative",
        "introduces": [],
        "discusses": [],
        "chapters": [],
    },
    "question": {
        "title": "",
        "kind": "question",
        "status": "open",
        "explores": [],
    },
    "reference": {
        "title": "",
        "kind": "reference",
        "key": "",
        "type": "article",
        "authors": [],
        "year": "",
    },
    "external-principal": {
        "title": "",
        "kind": "external-principal",
        "description": "",
        "oauth-issuer": "",
        "oauth-subject": "",
        "email": "",
        "granted-profiles": [],
        "mapped-to-personnel": "",
    },
}

_RUBRIC_BODY = """\
## Etymology / Lineage

## Definitional structure

## Examples

## Adjacent

## Open questions

## See also
"""

_THEOREMLIKE_BODY = """\
## Statement

## Proof

$\\square$
"""

_QUESTION_BODY = """\
## Background

## What's known

## What's open
"""

_EXTERNAL_PRINCIPAL_BODY = """\
## Identity

The OAuth subject + issuer pair above is the canonical key. `email` is for human readability only; it is **not** the auth identifier.

## Authorization

`granted-profiles` enumerates the `pyfars mcp --expose` profile names this principal may invoke. An empty list grants nothing.

## Linkage

If this principal corresponds to a known personnel record, link it via `mapped-to-personnel:` so dispatch and witness records can resolve to the same identity.
"""

_DEFAULT_BODY = ""


def render(*,
           kind: str,
           slug: str,
           title: str | None = None,
           component_of: str | None = None,
           depends_on: list[str] | None = None,
           ) -> str:
    fm = dict(_FM_TEMPLATES.get(kind, {"title": "", "kind": kind}))
    fm["title"] = title or slug.replace("-", " ").capitalize()
    if component_of and "component-of" not in fm:
        fm = {"title": fm["title"], "kind": fm["kind"], "component-of": component_of, **{k: v for k, v in fm.items() if k not in ("title", "kind")}}
    elif component_of:
        fm["component-of"] = component_of
    if depends_on:
        if "depends-on" in fm:
            fm["depends-on"] = list(depends_on)
        else:
            fm["depends-on"] = list(depends_on)

    if kind in ("concept", "definition", "morphism"):
        body = _RUBRIC_BODY
    elif kind in ("theorem", "lemma", "proposition", "corollary"):
        body = _THEOREMLIKE_BODY
    elif kind == "question":
        body = _QUESTION_BODY
    elif kind == "external-principal":
        body = _EXTERNAL_PRINCIPAL_BODY
    else:
        body = _DEFAULT_BODY

    fm_yaml = dump(fm).rstrip() + "\n"
    return f"---\n{fm_yaml}---\n\n{body}"
