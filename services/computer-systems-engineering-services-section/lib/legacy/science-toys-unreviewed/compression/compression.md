# Compression

Meaning-compression benchmarks. The thesis: in sequential event data,
most intermediate states are redundant under the relational-ordering
algebra, even when they are statistically incompressible. RO peels
algebraic redundancy at different scales; standard compression peels
statistical redundancy. They are orthogonal axes.

## Toys

- [`compression-test-ro-alone.py`](compression-test-ro-alone.py) — Pure
  algebraic vs pure statistical. Each RO^n level peels algebraic
  redundancy at a different scale, with no combination with standard
  codecs.
- [`compression-test-ro-over-normal.py`](compression-test-ro-over-normal.py)
  — Relational Ordering codec stacked over standard compression. The
  composition shows what RO catches that statistical codecs miss.
