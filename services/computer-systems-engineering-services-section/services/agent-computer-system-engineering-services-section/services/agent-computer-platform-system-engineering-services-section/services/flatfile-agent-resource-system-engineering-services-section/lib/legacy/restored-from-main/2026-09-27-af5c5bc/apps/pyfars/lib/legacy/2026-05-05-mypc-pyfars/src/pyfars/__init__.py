"""Tools for the relationality repository's frontmatter-markdown pyfars.

Every leaf module is one of:
  - one frozen dataclass        (under ``pyfars.substrate.types``)
  - one pure function           (everywhere else)
  - one CLI entry               (``pyfars.cli.<verb>``)

Composition happens at the call site. No leaf module orchestrates.
"""
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.types.reference import Reference
from pyfars.substrate.predication import Predication
from pyfars.substrate.types.claim import Claim
from pyfars.substrate.types.link import Link
from pyfars.substrate.types.citekey import CiteKey
from pyfars.substrate.types.bibentry import BibEntry
from pyfars.substrate.types.diagnostic import Diagnostic

__all__ = [
    "Flatfile", "Reference", "Predication", "Claim", "Link",
    "CiteKey", "BibEntry", "Diagnostic",
]
