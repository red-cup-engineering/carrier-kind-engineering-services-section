"""
Analyze the extracted graph. What are the densest tokens?
What clusters emerge? What does the graph actually look like?
"""

import json
import sys
from collections import Counter, defaultdict


def main():
    data = json.loads(open(sys.argv[1], encoding="utf-8").read())

    bases = {b["id"]: b for b in data["bases"]}
    claims = data["claims"]

    files = [b for b in data["bases"] if b["kind"] == "file"]
    tokens = [b for b in data["bases"] if b["kind"] == "token"]

    print(f"=== GRAPH OVERVIEW ===")
    print(f"Files: {len(files)}")
    print(f"Tokens: {len(tokens)}")
    print(f"Claims: {len(claims)}")
    print()

    # What predicates exist and how often?
    pred_counts = Counter(c["predicate"] for c in claims)
    print(f"=== PREDICATES ({len(pred_counts)} unique) ===")
    for pred, count in pred_counts.most_common(40):
        print(f"  {count:>5}  {pred}")
    print()

    # Which tokens are most connected? (appear as object in most claims)
    token_degree = Counter()
    for c in claims:
        token_degree[c["object"]] += 1

    print(f"=== DENSEST TOKENS (most files claim them) ===")
    for tid, count in token_degree.most_common(50):
        b = bases.get(tid)
        if b and b["kind"] == "token":
            print(f"  {count:>5}  {b['value'][:80]}")
    print()

    # Which files have the most claims?
    file_degree = Counter()
    for c in claims:
        file_degree[c["subject"]] += 1

    print(f"=== MOST-CONNECTED FILES (most claims in frontmatter) ===")
    for fid, count in file_degree.most_common(20):
        b = bases.get(fid)
        if b:
            print(f"  {count:>5}  {b['value'][:80]}")
    print()

    # For each predicate, how many unique values?
    pred_values = defaultdict(set)
    for c in claims:
        pred_values[c["predicate"]].add(c["object"])

    print(f"=== PREDICATE CARDINALITY (unique values per predicate) ===")
    for pred, vals in sorted(pred_values.items(), key=lambda x: -len(x[1]))[:30]:
        print(f"  {len(vals):>5}  {pred}")
    print()

    # Tokens that bridge multiple predicates (appear as value for different keys)
    token_preds = defaultdict(set)
    for c in claims:
        token_preds[c["object"]].add(c["predicate"])

    multi_pred = {tid: preds for tid, preds in token_preds.items() if len(preds) > 1}
    print(f"=== TOKENS APPEARING UNDER MULTIPLE PREDICATES ({len(multi_pred)}) ===")
    for tid, preds in sorted(multi_pred.items(), key=lambda x: -len(x[1]))[:30]:
        b = bases.get(tid)
        if b and b["kind"] == "token":
            print(f"  {b['value'][:50]:50s}  predicates: {', '.join(sorted(preds))}")


if __name__ == "__main__":
    main()
