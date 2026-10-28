#!/usr/bin/env python3
"""Exact finite controls for the proposed context-transport extension.

Finite symbols select points in the source-defined carriers. They are not a
runtime implementation of PredicationCell, Valuation, identity or receiving.
Only Python's standard library is used. No old revocation assay is imported.
"""

from dataclasses import dataclass
import json


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def quotient(partition):
    """A finite set quotient as a presentation-to-equivalence-class map."""
    q = {}
    for block in partition:
        block = frozenset(block)
        require(bool(block), "Empty equivalence block")
        for point in block:
            require(point not in q, "Overlapping equivalence blocks")
            q[point] = block
    return q


def compose(g, f):
    return {x: g[y] for x, y in f.items()}


def descend(base, mapped_result):
    """Return the unique image map, or an exact inconsistent input pair."""
    require(base.keys() == mapped_result.keys(), "Unequal descent domains")
    result, witness = {}, {}
    for x, image in base.items():
        if image in result and result[image] != mapped_result[x]:
            return None, (witness[image], x)
        result[image] = mapped_result[x]
        witness[image] = x
    return result, None


def success(value):
    return ("success", value)


def failure(value):
    return ("failure", value)


def map_success(mapping, result):
    tag, value = result
    require(tag in ("success", "failure"), "Unknown result tag")
    return success(mapping[value]) if tag == "success" else result


def channel_compose(g, f):
    return {x: g[r[1]] if r[0] == "success" else r for x, r in f.items()}


def channel_descend(f, rx, ry):
    return descend(rx, {x: map_success(ry, result) for x, result in f.items()})


def relabel_channel(f, rx, ry):
    require(len(set(rx.values())) == len(rx), "Relabeling must be injective")
    result, obstruction = channel_descend(f, rx, ry)
    require(obstruction is None, "Bijective relabeling obstructed")
    return result


def check_coarsening():
    q0 = quotient([{"p0"}, {"p1"}, {"p2"}])
    q1 = quotient([{"p0", "p1"}, {"p2"}])
    q2 = quotient([{"p0", "p1", "p2"}])
    a01, bad01 = descend(q0, q1)
    a12, bad12 = descend(q1, q2)
    a02, bad02 = descend(q0, q2)
    identity, bad_id = descend(q0, q0)
    require(all(bad is None for bad in (bad01, bad12, bad02, bad_id)),
            "Lawful coarsening failed")
    require(compose(a12, a01) == a02, "Actor coarsening composition failed")
    require(all(a == b for a, b in identity.items()), "Actor identity failed")
    subject = {"w0": "p0", "w1": "p1", "w2": "p2", "w0b": "p0"}
    b0, b1 = compose(q0, subject), compose(q1, subject)
    require(compose(a01, b0) == b1, "Bearer square failed")
    for old_actor in set(q0.values()):
        old_fiber = {w for w in subject if b0[w] == old_actor}
        new_fiber = {w for w in subject if b1[w] == a01[old_actor]}
        require(old_fiber <= new_fiber, "Action-fiber transport failed")
    return {"status": "pass", "actor_identity": True,
            "successive_equals_direct": True, "bearer_square": True,
            "action_fibers_preserved": True}


def check_relabeling():
    q0 = quotient([{"p0", "p1"}, {"p2"}])
    t = {"p0": "a", "p1": "b", "p2": "c"}
    q1 = quotient([{"a", "b"}, {"c"}])
    actor, bad = descend(q0, compose(q1, t))
    back, bad_back = descend(q1, compose(q0, {v: k for k, v in t.items()}))
    require(bad is None and bad_back is None, "Actor relabeling obstructed")
    require(all(back[actor[a]] == a for a in set(q0.values())), "No inverse")
    f = {"x0": success("y0"), "x1": failure("unsupported"), "x2": success("y1")}
    g = {"y0": success("z0"), "y1": failure("exhausted")}
    rx = {x: "new_" + x for x in f}
    ry = {y: "new_" + y for y in g}
    rz = {"z0": "new_z0"}
    f1, g1 = relabel_channel(f, rx, ry), relabel_channel(g, ry, rz)
    direct = relabel_channel(channel_compose(g, f), rx, rz)
    require(channel_compose(g1, f1) == direct, "Conjugated composition failed")
    identity = {x: success(x) for x in f}
    require(relabel_channel(identity, rx, rx) == {v: success(v) for v in rx.values()},
            "Conjugated identity failed")
    require(direct[rx["x1"]] == failure("unsupported"), "First refusal changed")
    require(direct[rx["x2"]] == failure("exhausted"), "Later refusal changed")
    return {"status": "pass", "actor_inverse": True, "channel_identity": True,
            "channel_composition": True, "exact_refusals_preserved": True}


@dataclass(frozen=True)
class MessagePoint:
    source: str
    target: str
    action: str
    content: str  # Opaque symbol for one fixed Valuation; no serialization claim.
    anchor: str


def check_evidence_refined_splitting():
    old = quotient([{"p0", "p1"}, {"receiver"}])
    new = quotient([{"p0"}, {"p1"}, {"receiver"}])
    actor_map, conflict = descend(old, new)
    require(actor_map is None and set(conflict) == {"p0", "p1"},
            "Actor-only split must be obstructed")
    subject = {"w0": "p0", "w1": "p1", "wr": "receiver"}
    alpha, beta = compose(old, subject), compose(new, subject)
    refined = {(alpha[w], w): beta[w] for w in subject}
    require(refined[(old["p0"], "w0")] == new["p0"], "First evidence lost")
    require(refined[(old["p1"], "w1")] == new["p1"], "Second evidence lost")
    partial_beta = {"w0": beta["w0"]}
    require(partial_beta.get("w1") is None, "Unresolved evidence acquired a default")
    owner_old = {"src0": old["p0"], "src1": old["p1"], "dst": old["receiver"]}
    owner_new = {"src0": new["p0"], "src1": new["p1"], "dst": new["receiver"]}
    origin = {("e0", "w0", "src0"), ("e1", "w1", "src1")}
    support = {("e0", "fixed_valuation_u"), ("e1", "fixed_valuation_u")}
    addressed = {("w0", "dst"), ("w1", "dst")}
    observable = {"e0", "e1"}

    def coherent(message, q, owner):
        return (q[subject[message.action]] == owner[message.source]
                and (message.anchor, message.action, message.source) in origin
                and (message.anchor, message.content) in support
                and (message.action, message.target) in addressed
                and message.anchor in observable)

    messages = (
        MessagePoint("src0", "dst", "w0", "fixed_valuation_u", "e0"),
        MessagePoint("src1", "dst", "w1", "fixed_valuation_u", "e1"),
    )
    original_fields = tuple(tuple(vars(m).items()) for m in messages)
    require(all(coherent(m, old, owner_old) and coherent(m, new, owner_new)
                for m in messages), "Evidence-preserving message split failed")
    wrong_origin = MessagePoint("src1", "dst", "w0", "fixed_valuation_u", "e0")
    require(not coherent(wrong_origin, old, owner_old),
            "Old merged actor improperly replaced origin evidence")
    require(original_fields == tuple(tuple(vars(m).items()) for m in messages),
            "Historical message fields mutated")
    return {"status": "pass", "actor_only_split": "obstructed",
            "exact_evidence_split": "resolved", "missing_evidence": "unresolved",
            "message_witnesses_retained": True, "mismatched_origin": "rejected"}


def check_result_collapse():
    rx, ry = {"x0": "x", "x1": "x"}, {"y": "y_new"}
    f = {"x0": success("y"), "x1": failure("unavailable")}
    result, conflict = channel_descend(f, rx, ry)
    require(result is None and conflict == ("x0", "x1"),
            "Success/refusal collapse was accepted")
    unequal_errors = {"x0": failure("unsupported"), "x1": failure("unavailable")}
    result, conflict_errors = channel_descend(unequal_errors, rx, ry)
    require(result is None and conflict_errors is not None, "Distinct refusals erased")
    kept, bad_kept = channel_descend(f, {"x0": "x_with_0", "x1": "x_with_1"}, ry)
    require(bad_kept is None and kept["x_with_0"] != kept["x_with_1"],
            "Retained evidence did not preserve behavior")
    f_ok = {"x0": success("y0"), "x1": success("y1")}
    g_ok = {"y0": failure("unavailable"), "y1": failure("unavailable")}
    out_map = {"y0": "y", "y1": "y"}
    f_bar, bf = channel_descend(f_ok, rx, out_map)
    g_bar, bg = channel_descend(g_ok, out_map, {})
    direct, bd = channel_descend(channel_compose(g_ok, f_ok), rx, {})
    require(bf is None and bg is None and bd is None, "Compatible collapse failed")
    require(channel_compose(g_bar, f_bar) == direct,
            "Channel composition under one migration failed")

    # Two context migrations: each has its own image and fiber-constancy check.
    f0 = {"x0": success("y0"), "x1": success("y1"),
          "x2": success("y2"), "x3": failure("unavailable")}
    r1x = {"x0": "u01", "x1": "u01", "x2": "u2", "x3": "u3"}
    r1y = {"y0": "v01", "y1": "v01", "y2": "v2"}
    f1, b1 = channel_descend(f0, r1x, r1y)
    s2x = {"u01": "a", "u2": "a", "u3": "refused", "unvisited": "outside"}
    s2y = {"v01": "b", "v2": "b", "unvisited_output": "outside_output"}
    sigma_x = {u: s2x[u] for u in set(r1x.values())}
    sigma_y = {v: s2y[v] for v in set(r1y.values())}
    f2, b2 = channel_descend(f1, sigma_x, sigma_y)
    composite_x, composite_y = compose(s2x, r1x), compose(s2y, r1y)
    f02, b02 = channel_descend(f0, composite_x, composite_y)
    require(b1 is None and b2 is None and b02 is None, "Staged constancy failed")
    require(f2 == f02, "Successive context descent differs from direct descent")
    require("outside" not in f2, "Unvisited intermediate input enlarged domain")
    require(set(f2) == set(composite_x.values()), "Wrong composite image domain")
    return {"status": "pass", "success_refusal_collapse": "obstructed",
            "unequal_refusal_collapse": "obstructed", "retained_input_evidence": "pass",
            "compatible_output_collapse": "pass", "channel_composition": "pass",
            "successive_context_descent": "equals_direct_on_composite_image",
            "unvisited_intermediate_input": "excluded"}


def main():
    controls = {
        "lawful_coarsening": check_coarsening(),
        "bijective_relabeling": check_relabeling(),
        "evidence_refined_splitting": check_evidence_refined_splitting(),
        "result_fiber_constancy": check_result_collapse(),
    }
    print(json.dumps({"status": "pass", "controls": controls,
                      "evidence_level": "exact finite set-model controls; not Lean or runtime",
                      "limits": ["Fixture evidence is stipulated, not independently observed",
                                 "No full Valuation codec or context index constructed",
                                 "No revocation enumeration rerun",
                                 "No native receiving or adequacy transport claimed"]}, indent=2))


if __name__ == "__main__":
    main()
