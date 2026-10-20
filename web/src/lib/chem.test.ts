import { describe, expect, it } from "vitest";

import elementsJson from "../../../api/app/seed/data/elements.json";
import materialsJson from "../../../api/app/seed/data/materials.json";
import type { ElementDetail, ElementSummary, Material } from "../api";
import { elementScore, exactElement, fmtPct, materialsWith, norm, prettyFormula, quickCheck, suggest } from "./chem";

type RawEl = (typeof elementsJson)[number];
const els: ElementSummary[] = elementsJson.map((e: RawEl) => ({
  ...e, family_code: e.family, featured: e.content.featured, everyday_use: e.content.everyday_use,
}));
const mats = materialsJson.map((m, i) => ({ ...m, id: i })) as unknown as Material[];
const names = (q: string) => suggest(norm(q), els, mats).map((s) => (s.kind === "element" ? s.element.symbol : s.material.name));

describe("search", () => {
  it("finds elements by symbol, number and name", () => {
    expect(exactElement("fe", els)?.name).toBe("Iron");
    expect(exactElement("26", els)?.symbol).toBe("Fe");
    expect(exactElement("aluminium", els)?.symbol).toBe("Al");
    expect(elementScore(els[25], "ir")).toBeGreaterThan(0);
  });

  it("suggests materials as you type, best match first", () => {
    expect(names("diam")[0]).toBe("Diamond");
    expect(names("salt")[0]).toBe("Table salt");
    expect(names("gold").slice(0, 2)).toEqual(["Au", "14k gold"]);
    expect(names("zzzz")).toEqual([]);
  });

  it("lists where an element hides", () => {
    expect(materialsWith("C", "Carbon", mats).map((m) => m.name)[0]).toBe("Diamond");
  });
});

describe("formatting", () => {
  it("subscripts formulas", () => {
    expect(prettyFormula("Ca5(PO4)3OH")).toBe("Ca₅(PO₄)₃OH");
    expect(prettyFormula("MgSO4·7H2O")).toBe("MgSO₄·7H₂O");
  });
  it("rounds percentages", () => {
    expect(fmtPct(88.81)).toBe("89%");
    expect(fmtPct(2.96)).toBe("3.0%");
    expect(fmtPct(0.01)).toBe("<0.1%");
  });
});

describe("quick check", () => {
  const detail = (e: ElementSummary, withQ: boolean) => {
    const raw = elementsJson[e.number - 1];
    return { ...e, ...raw, content: { ...raw.content, check_question: withQ ? raw.content.check_question : null } } as unknown as ElementDetail;
  };
  it("uses the curated question for featured elements", () => {
    const q = quickCheck(detail(els[25], true));
    expect(q.correct).toBe("Carries oxygen");
    expect(q.options).toHaveLength(4);
  });
  it("asks about valence or protons otherwise, with the right answer among 4 options", () => {
    for (const e of els.slice(0, 54)) {
      const q = quickCheck(detail(e, false));
      expect(q.options).toContain(q.correct);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });
});
