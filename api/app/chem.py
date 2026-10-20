"""Chemical formula parsing and composition by mass. No database or settings imports,
so the seed builder script can use it too."""
from __future__ import annotations

import re


def _parse_group(s: str) -> dict[str, float]:
    stack: list[dict[str, float]] = [{}]
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "(":
            stack.append({}); i += 1
        elif ch == ")":
            if len(stack) == 1:
                raise ValueError("unmatched ')'")
            i += 1
            n = ""
            while i < len(s) and (s[i].isdigit() or s[i] == "."):
                n += s[i]; i += 1
            g = stack.pop()
            mul = float(n) if n else 1.0
            for k, v in g.items():
                stack[-1][k] = stack[-1].get(k, 0) + v * mul
        else:
            m = re.match(r"([A-Z][a-z]?)(\d*\.?\d*)", s[i:])
            if not m or not m.group(1):
                raise ValueError(f"can't read the formula near “{s[i:i + 6]}”")
            stack[-1][m.group(1)] = stack[-1].get(m.group(1), 0) + (float(m.group(2)) if m.group(2) else 1.0)
            i += len(m.group(0))
    if len(stack) != 1:
        raise ValueError("unmatched '('")
    return stack[0]


def parse_formula(f: str) -> dict[str, float]:
    """'Ca5(PO4)3OH' → {'Ca': 5, 'P': 3, 'O': 13, 'H': 1}. Hydrates with '·' or '*' are supported."""
    f = f.replace(" ", "")
    if not f:
        raise ValueError("empty formula")
    total: dict[str, float] = {}
    for part in re.split(r"[·*](?=\d*[A-Z(])", f):
        m = re.match(r"^(\d*\.?\d+)?(.*)$", part)
        assert m
        mul = float(m.group(1)) if m.group(1) else 1.0
        for k, v in _parse_group(m.group(2)).items():
            total[k] = total.get(k, 0) + v * mul
    return total


def mass_composition(atoms: dict[str, float], masses: dict[str, float]) -> dict[str, float]:
    unknown = [s for s in atoms if s not in masses]
    if unknown:
        raise ValueError(f"not an element symbol: {', '.join(unknown)}")
    w = {s: n * masses[s] for s, n in atoms.items()}
    t = sum(w.values())
    return {s: round(v / t * 100, 4) for s, v in sorted(w.items(), key=lambda kv: -kv[1])}


def tidy_atoms(atoms: dict[str, float]) -> dict[str, float]:
    return {k: (int(v) if v == int(v) else v) for k, v in atoms.items()}
