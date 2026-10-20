"""Multiple-choice questions about elements, used by flashcard reviews and quizzes.

Each element has a few "facts" (card types). A question is generated fresh each time,
with new wrong answers, so students learn the fact rather than the option layout.
"""
from __future__ import annotations

import random
from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Element, Family

FACTS = ("symbol", "family", "valence", "use", "latin")
FACT_LABELS = {"symbol": "Symbols", "family": "Families", "valence": "Electrons", "use": "Everyday life", "latin": "Latin names"}


@dataclass
class Question:
    element: int
    fact: str
    kind: str
    prompt: str
    options: list[str]
    answer: str
    explanation: str

    def public(self) -> dict:
        """Without the answer (for reviews, where the server checks it)."""
        d = asdict(self)
        d.pop("answer"); d.pop("explanation")
        return d

    def full(self) -> dict:
        return asdict(self)


class Bank:
    """All elements and families loaded once per request."""

    def __init__(self, db: Session, rng: random.Random | None = None) -> None:
        self.rng = rng or random.Random()
        self.els: list[Element] = list(db.scalars(select(Element).order_by(Element.number)).unique())
        self.by_num = {e.number: e for e in self.els}
        self.families = {f.code: f for f in db.scalars(select(Family))}

    # ------------------------------------------------------------ facts

    @staticmethod
    def has_specific_use(e: Element) -> bool:
        use = e.content.everyday_use if e.content else ""
        return bool(use) and "research only" not in use.lower() and "particle accelerators" not in use.lower()

    def facts_for(self, e: Element) -> list[str]:
        out = ["symbol", "family"]
        if e.valence_electrons is not None:
            out.append("valence")
        if self.has_specific_use(e):
            out.append("use")
        if e.latin_name:
            out.append("latin")
        return out

    # ------------------------------------------------------------ helpers

    def _pick(self, pool: list, n: int, exclude) -> list:
        pool = [p for p in dict.fromkeys(pool) if p != exclude]
        self.rng.shuffle(pool)
        return pool[:n]

    def _options(self, answer: str, wrong: list[str]) -> list[str]:
        opts = [answer, *wrong[:3]]
        self.rng.shuffle(opts)
        return opts

    # ------------------------------------------------------------ generator

    def question(self, number: int, fact: str) -> Question:
        e = self.by_num[number]
        fam = self.families[e.family_code]
        if fact == "symbol":
            similar = [x.symbol for x in self.els if x.symbol[0] == e.symbol[0] and x.number != e.number]
            near = [x.symbol for x in self.els if abs(x.number - e.number) <= 6 and x.number != e.number]
            wrong = self._pick(similar, 2, e.symbol) + self._pick(near, 3, e.symbol)
            wrong = list(dict.fromkeys(wrong))[:3]
            why = f"{e.name} is {e.symbol}, element #{e.number}."
            if e.latin_name:
                why = f"{e.symbol} comes from its Latin name, {e.latin_name}. " + why
            return Question(number, fact, "Symbols", f"What is the chemical symbol for {e.name}?", self._options(e.symbol, wrong), e.symbol, why)

        if fact == "family":
            others = [f.name for c, f in self.families.items() if c not in (e.family_code, "uk")]
            return Question(number, fact, "Families", f"Which family does {e.name} ({e.symbol}) belong to?",
                            self._options(fam.name, self._pick(others, 3, fam.name)), fam.name,
                            f"{e.name} is a {fam.name.lower()}. {fam.description}")

        if fact == "valence":
            v = e.valence_electrons
            assert v is not None
            wrong = [str(x) for x in self._pick([x for x in range(1, 9) if x != v], 3, v)]
            where = f"group {e.group}" if e.group else "its group"
            return Question(number, fact, "Electrons", f"How many valence (outer) electrons does {e.name} have?",
                            self._options(str(v), wrong), str(v),
                            f"{e.name} is in {where}, so it has {v} valence electron{'s' if v > 1 else ''}. "
                            "Groups 1–2 have 1–2; groups 13–18 have 3–8.")

        if fact == "use":
            use = e.content.everyday_use if e.content else ""
            pool = [x.name for x in self.els if self.has_specific_use(x) and x.number != e.number]
            return Question(number, fact, "Everyday life", f"Which element is used for: {use[0].lower() + use[1:]}?",
                            self._options(e.name, self._pick(pool, 3, e.name)), e.name, f"{e.name} ({e.symbol}): {use}.")

        if fact == "latin":
            pool = [x.latin_name for x in self.els if x.latin_name and x.number != e.number]
            return Question(number, fact, "Latin names", f"{e.name}'s symbol is {e.symbol}. Which Latin name does it come from?",
                            self._options(e.latin_name or "", self._pick(pool, 3, e.latin_name)), e.latin_name or "",
                            f"{e.symbol} stands for {e.latin_name}, the Latin name for {e.name.lower()}.")

        raise ValueError(f"unknown fact {fact!r}")

    def random_question(self, number: int) -> Question:
        return self.question(number, self.rng.choice(self.facts_for(self.by_num[number])))
