"""Drawing conflict where it lives — the payoff of localization, made visual.

Optional: needs ``networkx`` and ``matplotlib`` (the ``notebooks`` extra). Imports
are deferred so the core stays dependency-free. Each function returns the
matplotlib ``Axes`` it drew on, so notebooks can compose or restyle.
"""

from __future__ import annotations

import importlib
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from .examples import Edge, Reading, graded_conflicts, sensor_fusion_sheaf
from .pysheaf_bridge import DiscreteGraphSheaf, compare_with_pysheaf

if TYPE_CHECKING:
    from matplotlib.axes import Axes

__all__ = ["draw_discrete_sheaf", "draw_sensor_fusion"]


def _require(name: str) -> Any:
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError as exc:  # pragma: no cover - trivial guard
        raise ModuleNotFoundError(
            f"pymetrologic.calculus.viz needs {name!r}; install the notebooks extra: "
            "`uv sync --extra notebooks`"
        ) from exc


def draw_discrete_sheaf(
    graph_sheaf: DiscreteGraphSheaf,
    *,
    ax: Axes | None = None,
) -> Axes:
    """Draw a discrete graph sheaf; edges in conflict are drawn red and bold.

    Vertices are labelled with their assigned value. Clean edges are thin grey;
    conflicted edges (the localized obstruction) are thick red.
    """
    nx = _require("networkx")
    plt = _require("matplotlib.pyplot")

    cmp = compare_with_pysheaf(graph_sheaf)
    conflicted = set(cmp.located_conflicts)

    g = nx.Graph()
    for v in graph_sheaf.vertices:
        g.add_node(v, value=graph_sheaf.assignment[v])
    for u, v in graph_sheaf.edges:
        g.add_edge(u, v, name=graph_sheaf.edge_name(u, v))

    if ax is None:
        _, ax = plt.subplots(figsize=(4, 4))
    pos = nx.spring_layout(g, seed=0)

    clean_edges = [(u, v) for u, v in g.edges if g[u][v]["name"] not in conflicted]
    bad_edges = [(u, v) for u, v in g.edges if g[u][v]["name"] in conflicted]
    nx.draw_networkx_edges(g, pos, edgelist=clean_edges, edge_color="#b0b0b0", width=1.5, ax=ax)
    nx.draw_networkx_edges(g, pos, edgelist=bad_edges, edge_color="#d62728", width=3.5, ax=ax)
    nx.draw_networkx_nodes(g, pos, node_color="#e8e8f0", edgecolors="#333", node_size=900, ax=ax)
    nx.draw_networkx_labels(
        g, pos, labels={v: f"{v}={graph_sheaf.assignment[v]}" for v in g.nodes}, ax=ax
    )
    verdict = "global section" if cmp.consistent else f"obstructed @ {sorted(conflicted)}"
    ax.set_title(f"radius {cmp.bilattice_radius} — {verdict}")
    ax.set_axis_off()
    return ax


def draw_sensor_fusion(
    readings: dict[str, Reading],
    edges: Sequence[Edge],
    *,
    ax: Axes | None = None,
) -> Axes:
    """Draw a continuous sensor network; edge colour/width grade the conflict.

    Edge thickness and redness scale with the graded conflict degree, so you can
    *see* not just where sensors disagree but how badly.
    """
    nx = _require("networkx")
    plt = _require("matplotlib.pyplot")

    sheaf, assignment = sensor_fusion_sheaf(readings, edges)
    conflicts = graded_conflicts(sheaf, assignment)

    g = nx.Graph()
    for v in readings:
        g.add_node(v)
    for u, v in edges:
        from pymetrologic import Site

        g.add_edge(u, v, name=Site.edge_name(u, v))

    if ax is None:
        _, ax = plt.subplots(figsize=(4, 4))
    pos = nx.spring_layout(g, seed=0)

    nx.draw_networkx_nodes(g, pos, node_color="#e8e8f0", edgecolors="#333", node_size=1100, ax=ax)
    labels = {v: f"{v}\n⟨{p:.1f},{c:.1f}⟩" for v, (p, c) in readings.items()}
    nx.draw_networkx_labels(g, pos, labels=labels, font_size=8, ax=ax)
    for u, v in g.edges:
        degree = conflicts.get(g[u][v]["name"], 0.0)
        nx.draw_networkx_edges(
            g,
            pos,
            edgelist=[(u, v)],
            edge_color=[(0.84, 0.15, 0.16, max(0.15, degree))],
            width=1.0 + 4.0 * degree,
            ax=ax,
        )
    worst = max(conflicts.values(), default=0.0)
    ax.set_title(f"sensor fusion — peak conflict {worst:.2f}")
    ax.set_axis_off()
    return ax
