#!/usr/bin/env python3
"""mine-triage-relevance.py — Pre-classify triage files by relevance to a focus.

Uses a local LLM (ollama) to read the first ~500 words of each triage
file and score its relevance to a given focus (0-3). Outputs a ranked
list of files worth reading in full. This replaces the expensive pattern
of sending all triage files to a large model for summarization.

Usage:
    python3 scripts/mine-triage-relevance.py --focus "semiotic specifications"
    python3 scripts/mine-triage-relevance.py --focus "governance" --dir "triage/specifications"
    python3 scripts/mine-triage-relevance.py --focus "closure dynamics" --threshold 2

Output: JSON lines to stdout, one per file, sorted by relevance descending.
"""

import argparse
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

sys.path.insert(0, str(SCRIPT_DIR))
import local_llm  # noqa: E402

for candidate in [REPO_ROOT / "content", REPO_ROOT.parent / "content"]:
    if candidate.is_dir() and (candidate / "triage").is_dir():
        CONTENT_DIR = candidate
        break
else:
    print("ERROR: Could not find content/triage/", file=sys.stderr)
    sys.exit(1)

TRIAGE_DIR = CONTENT_DIR / "triage"
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".obsidian", ".trash"}

# Per-directory quality metadata. Slop directories get score penalties.
# This is loaded from triage/TRIAGE.md at runtime if it exists,
# but these defaults cover the known directories.
DIR_QUALITY = {
    "collapse dynamics": "slop",
    "theorem": "slop",
    "notebooklm": "slop",
    "engine": "authored",
    "specifications": "authored",
    "texts": "authored",
    "Groundhog Autonomous Zone": "authored",
    "old-notes": "imported",
    "library": "imported",
    "AGRODAO": "curated",
    "Delta Register": "curated",
    "Marmot Manual": "curated",
    "triage-materials": "curated",
}

# Score penalty for slop content: subtract from relevance score
SLOP_PENALTY = 2  # effectively requires score 3 from ollama to pass threshold 2


def get_dir_quality(filepath):
    """Determine the quality level of a file based on its directory."""
    try:
        rel = filepath.relative_to(TRIAGE_DIR)
        top_dir = rel.parts[0] if rel.parts else ""
        return DIR_QUALITY.get(top_dir, "unknown")
    except ValueError:
        return "unknown"

CLASSIFY_PROMPT = """You are a technical relevance classifier. Given a focus topic and a file excerpt, rate how TECHNICALLY useful the file is for writing a specification about the focus. Score 0-3:

0 = not relevant, or only shares vocabulary without technical substance
1 = tangentially related, discusses the topic but without definitions, schemas, or concrete mechanisms
2 = contains definitions, interfaces, data structures, protocols, or concrete mechanisms relevant to the focus
3 = directly provides technical structure (schemas, type definitions, lifecycle states, validation rules, APIs) that a specification could formalize

IMPORTANT: Philosophical discussion, motivation, or argumentation about WHY something matters scores 0-1 even if it uses relevant vocabulary. Only score 2-3 if the text contains technical structure: definitions you could put in a spec, schemas you could validate against, interfaces you could implement, protocols you could follow.

Output ONLY a JSON object with two fields:
- "score": integer 0-3
- "reason": one sentence explaining what technical content was found (or why none was) (max 20 words)

Do not output anything else.

Focus: {focus}

File path: {path}

File excerpt (first ~500 words):
{excerpt}
"""


def get_excerpt(filepath, max_words=500):
    """Read the first ~500 words of a file."""
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""

    # Strip frontmatter for the excerpt
    if text.startswith("---"):
        end = text.find("---", 3)
        if end > 0:
            text = text[end + 3:]

    words = text.split()
    return " ".join(words[:max_words])


def classify_file(filepath, focus, model=DEFAULT_MODEL):
    """Ask ollama to classify a file's relevance to the focus."""
    rel_path = str(filepath.relative_to(CONTENT_DIR))
    excerpt = get_excerpt(filepath)

    if not excerpt.strip():
        return {"path": rel_path, "score": 0, "reason": "empty file"}

    prompt = CLASSIFY_PROMPT.format(
        focus=focus,
        path=rel_path,
        excerpt=excerpt[:3000],  # hard cap on excerpt length
    )

    result = local_llm.complete(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        temperature=0.1,
        max_tokens=100,
    )

    if result["error"]:
        return {"path": rel_path, "score": -1, "reason": f"LLM error: {result['error']}"}

    response_text = result["response"].strip()

    # Parse the JSON response
    try:
        # Find JSON in the response (model might wrap it in markdown)
        json_match = response_text
        if "```" in json_match:
            json_match = json_match.split("```")[1]
            if json_match.startswith("json"):
                json_match = json_match[4:]
        parsed = json.loads(json_match.strip())
        raw_score = int(parsed.get("score", 0))
        reason = parsed.get("reason", "")
        quality = get_dir_quality(filepath)
        penalty = SLOP_PENALTY if quality == "slop" else 0
        adjusted = max(min(raw_score, 3) - penalty, 0)
        return {
            "path": rel_path,
            "score": adjusted,
            "raw_score": raw_score,
            "quality": quality,
            "reason": reason,
        }
    except (json.JSONDecodeError, ValueError, KeyError):
        # If parsing fails, try to extract a number
        for ch in response_text:
            if ch in "0123":
                quality = get_dir_quality(filepath)
                penalty = SLOP_PENALTY if quality == "slop" else 0
                raw = int(ch)
                return {
                    "path": rel_path,
                    "score": max(raw - penalty, 0),
                    "raw_score": raw,
                    "quality": quality,
                    "reason": response_text[:60],
                }
        return {"path": rel_path, "score": -1, "reason": f"parse error: {response_text[:60]}"}


def collect_files(search_dir):
    """Collect all .md files in the search directory."""
    files = []
    for root, dirs, filenames in os.walk(search_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in sorted(filenames):
            if f.endswith(".md"):
                files.append(Path(root) / f)
    return files


def main():
    parser = argparse.ArgumentParser(
        description="Pre-classify triage files by relevance to a focus"
    )
    parser.add_argument("--focus", required=True,
                        help="The topic/focus to classify relevance against")
    parser.add_argument("--dir", default="",
                        help="Subdirectory of triage/ to search (default: all)")
    parser.add_argument("--threshold", type=int, default=2,
                        help="Minimum relevance score to include (default: 2)")
    parser.add_argument("--model", default="",
                        help="Model to use (default: auto-selected)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max files to classify (0=all)")
    parser.add_argument("--all", action="store_true",
                        help="Search all content, not just triage")
    args = parser.parse_args()

    if args.all:
        search_dir = CONTENT_DIR
    elif args.dir:
        search_dir = TRIAGE_DIR / args.dir
    else:
        search_dir = TRIAGE_DIR

    if not search_dir.is_dir():
        print(f"ERROR: Not a directory: {search_dir}", file=sys.stderr)
        sys.exit(1)

    files = collect_files(search_dir)
    if args.limit > 0:
        files = files[:args.limit]

    print(f"Classifying {len(files)} files against focus: {args.focus}",
          file=sys.stderr)

    active_model = args.model or local_llm.suggest_model("classification")
    print(f"Using model: {active_model}", file=sys.stderr)

    results = []
    for i, filepath in enumerate(files):
        result = classify_file(filepath, args.focus, model=active_model)
        results.append(result)
        if (i + 1) % 10 == 0:
            print(f"  ... {i + 1}/{len(files)}", file=sys.stderr)

    # Sort by score descending, filter by threshold
    results.sort(key=lambda r: r["score"], reverse=True)
    relevant = [r for r in results if r["score"] >= args.threshold]

    print(f"\n{len(relevant)} files scored >= {args.threshold} "
          f"out of {len(results)} total", file=sys.stderr)

    # Output as JSON lines
    for r in relevant:
        print(json.dumps(r))


if __name__ == "__main__":
    main()
