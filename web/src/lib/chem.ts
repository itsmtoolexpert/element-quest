import type { CheckQuestion, ElementDetail, ElementSummary, Material } from "../api";

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** "Ca5(PO4)3OH" → "Ca₅(PO₄)₃OH" */
export function prettyFormula(f: string): string {
  return f.replace(/([A-Za-z)])(\d+(?:\.\d+)?)/g, (_, a: string, d: string) =>
    a + d.split("").map((c) => (c === "." ? "." : SUB[+c])).join(""));
}

export function fmtPct(p: number): string {
  if (p >= 10) return `${Math.round(p)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return "<0.1%";
}

/** Colors for composition bars, in order of share. */
export const PALETTE = ["#FF595E", "#1982C4", "#FFCA3A", "#8AC926", "#7B61FF", "#FF924C", "#2EC4B6", "#F15BB5", "#4CC9F0", "#D883FF"];

// ------------------------------------------------------------------ search

const ALT_NAMES: Record<string, string> = { aluminium: "Al", caesium: "Cs", sulphur: "S" };

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function exactElement(q: string, els: ElementSummary[]): ElementSummary | undefined {
  const alt = ALT_NAMES[q];
  return els.find((e) => e.name.toLowerCase() === q || e.symbol.toLowerCase() === q || String(e.number) === q || e.symbol === alt);
}

/** 0 = no match; higher = better. Used for live highlighting and suggestions. */
export function elementScore(e: ElementSummary, q: string): number {
  if (!q) return 0;
  const name = e.name.toLowerCase(), sym = e.symbol.toLowerCase();
  if (sym === q || String(e.number) === q || name === q || e.symbol === ALT_NAMES[q]) return 4;
  if (name.startsWith(q)) return 3;
  if (q.length > 1 && sym.startsWith(q)) return 2;
  if (name.includes(q)) return 1;
  return 0;
}

function keysOf(m: Material): string[] {
  return [m.name.toLowerCase(), ...m.aliases];
}

/** 3 exact name/alias, 2.5 name starts with it, 2 alias prefix or whole-word, 1 contains (3+ letters). */
export function materialScore(m: Material, q: string): number {
  if (q.length < 2) return 0;
  let s = m.name.toLowerCase().startsWith(q) ? 2.5 : 0;
  for (const k of keysOf(m)) {
    if (k === q) return 3;
    if (k.startsWith(q) || k.split(/[\s(/]+/).some((w) => w === q || w.startsWith(q))) s = Math.max(s, 2);
    else if (q.length >= 3 && k.includes(q)) s = Math.max(s, 1);
  }
  return s;
}

export type Suggestion =
  | { kind: "element"; score: number; element: ElementSummary }
  | { kind: "material"; score: number; material: Material };

export function suggest(q: string, els: ElementSummary[], mats: Material[], limit = 8): Suggestion[] {
  if (!q) return [];
  const e: Suggestion[] = els.map((element) => ({ kind: "element" as const, score: elementScore(element, q), element }))
    .filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.element.number - b.element.number);
  const m: Suggestion[] = mats.map((material) => ({ kind: "material" as const, score: materialScore(material, q), material }))
    .filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.material.name.localeCompare(b.material.name));
  // Interleave by score (element scores run 1–4, material 1–3; treat 4 as 3.5 so exact elements lead).
  const all = [...e.slice(0, 5), ...m.slice(0, 5)];
  const rank = (s: Suggestion) => (s.kind === "element" ? (s.score === 4 ? 3.5 : s.score) : s.score);
  return all.sort((a, b) => rank(b) - rank(a)).slice(0, limit);
}

/** Materials containing an element, biggest share first (skips the pure element itself). */
export function materialsWith(symbol: string, name: string, mats: Material[]): Material[] {
  return mats
    .filter((m) => symbol in m.composition && !(Object.keys(m.composition).length === 1 && m.name.toLowerCase() === name.toLowerCase()))
    .sort((a, b) => b.composition[symbol] - a.composition[symbol]);
}

// ------------------------------------------------------------------ quick check

export interface Question { kind: string; question: string; correct: string; options: string[]; explanation: string }

export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** The element file's quick check: the curated question if there is one, else valence or protons. */
export function quickCheck(e: ElementDetail): Question {
  const cq: CheckQuestion | null | undefined = e.content?.check_question;
  if (cq) return { kind: "Real-life chemistry", question: cq.question, correct: cq.correct, options: shuffle([cq.correct, ...cq.wrong.slice(0, 3)]), explanation: cq.explanation };
  const v = e.valence_electrons;
  if (v != null && e.number % 2 === 0) {
    const wrong = shuffle([1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== v)).slice(0, 3).map(String);
    return {
      kind: "Electrons", question: `How many outer (valence) electrons does ${e.name} have?`, correct: String(v),
      options: shuffle([String(v), ...wrong]),
      explanation: `${e.name} is in group ${e.group}, so it has ${v} valence electron${v > 1 ? "s" : ""}. Those outer electrons decide how it reacts.`,
    };
  }
  const mass = Math.round(parseFloat(e.mass));
  const wrong = [...new Set([e.number - 1, e.number + 1, e.number + 2, e.number - 2, mass])]
    .filter((x) => x > 0 && x !== e.number);
  return {
    kind: "Atomic number", question: `How many protons are in every atom of ${e.name}?`, correct: String(e.number),
    options: shuffle([String(e.number), ...shuffle(wrong).slice(0, 3).map(String)]),
    explanation: `The atomic number is the proton count: ${e.number}. Change the protons and you get a different element.`,
  };
}

/** Same element every day for everyone, cycling through the featured ones. */
export function elementOfTheDay(els: ElementSummary[]): ElementSummary | undefined {
  const featured = els.filter((e) => e.featured);
  if (!featured.length) return undefined;
  const d = new Date();
  const day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000);
  return featured[day % featured.length];
}
