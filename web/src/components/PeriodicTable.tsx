import { useState } from "react";

import type { ElementSummary, Family } from "../api";
import { fmtPct } from "../lib/chem";

/** Grid position: main table rows 1–7, then the lanthanide/actinide rows 9–10 (row 8 is a gap). */
function place(e: ElementSummary): { col: number; row: number } {
  if (e.group != null) return { col: e.group + 1, row: e.period + 1 };
  const offset = e.period === 6 ? e.number - 57 : e.number - 89;
  return { col: offset + 4, row: e.period + 4 };
}

export interface TableState {
  /** Elements shown at full strength; others are dimmed. null = all. */
  visible: Set<number> | null;
  /** Elements that glow (search hits, finder matches). */
  glowing: Set<number>;
  /** Percentage badges, e.g. from a "What's inside" result. */
  pct: Map<string, number>;
  seen: Set<number>;
}

const CELL = "clamp(44px, 5.1vw, 64px)";
const ROW = "clamp(48px, 5.6vw, 70px)";

export default function PeriodicTable({
  elements, families, state, onPick, colorOf, showPreview = true,
}: {
  elements: ElementSummary[]; families: Map<string, Family>; state: TableState;
  onPick: (e: ElementSummary, from: HTMLElement) => void;
  /** Override tile color (e.g. by mastery level); defaults to family color. */
  colorOf?: (e: ElementSummary) => string;
  showPreview?: boolean;
}) {
  const [hover, setHover] = useState<ElementSummary>(() => elements.find((e) => e.symbol === "Fe") ?? elements[0]);
  const hf = families.get(hover.family_code);

  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface p-3" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="grid w-max gap-[3px]"
        style={{ gridTemplateColumns: `18px repeat(18, ${CELL})`, gridTemplateRows: `18px repeat(7, ${ROW}) 12px repeat(2, ${ROW})` }}>
        {Array.from({ length: 18 }, (_, g) => (
          <div key={`g${g}`} className="grid place-items-center font-mono text-[10px] text-muted" style={{ gridColumn: g + 2, gridRow: 1 }}>{g + 1}</div>
        ))}
        {Array.from({ length: 7 }, (_, p) => (
          <div key={`p${p}`} className="grid place-items-center font-mono text-[10px] text-muted" style={{ gridColumn: 1, gridRow: p + 2 }}>{p + 1}</div>
        ))}
        {[["57–71", "ln", 7], ["89–103", "ac", 8]].map(([t, c, r]) => (
          <div key={String(t)} className="grid place-items-center rounded-lg border border-dashed font-mono text-[10px] text-muted"
            style={{ gridColumn: 4, gridRow: r as number, borderColor: families.get(c as string)?.color }}>{t}</div>
        ))}
        {[["Lanthanides", 10], ["Actinides", 11]].map(([t, r]) => (
          <div key={String(t)} className="flex items-center justify-end pr-1.5 text-right text-[10px] leading-tight text-muted"
            style={{ gridColumn: "2 / 4", gridRow: r as number }}>{t}</div>
        ))}

        {/* Preview of the hovered element in the empty space above the transition metals */}
        {showPreview && <div className="pointer-events-none hidden items-center gap-3 px-2 md:flex" style={{ gridColumn: "5 / 14", gridRow: "2 / 5" }} aria-hidden="true">
          <div className="tint flex aspect-square h-[80%] flex-col items-center justify-center rounded-2xl border-2" style={{ ["--c" as string]: hf?.color }}>
            <span className="font-mono text-xs text-muted">{hover.number}</span>
            <span className="font-display text-5xl font-extrabold leading-none">{hover.symbol}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold">{hover.name}</h3>
            <p className="text-sm text-muted"><b>{hf?.name}</b> · {hover.mass} u{hover.valence_electrons != null ? ` · ${hover.valence_electrons} valence e⁻` : ""}</p>
            <p className="line-clamp-2 max-w-[42ch] text-sm text-muted">{hover.everyday_use}</p>
          </div>
        </div>}

        {elements.map((e) => {
          const { col, row } = place(e);
          const fam = families.get(e.family_code);
          const dim = state.visible != null && !state.visible.has(e.number);
          const glow = !dim && state.glowing.has(e.number);
          const pct = state.pct.get(e.symbol);
          return (
            <button key={e.number}
              onClick={(ev) => onPick(e, ev.currentTarget)}
              onMouseEnter={() => setHover(e)} onFocus={() => setHover(e)}
              aria-label={`${e.name}, ${e.symbol}, atomic number ${e.number}${state.seen.has(e.number) ? ", explored" : ""}`}
              className={`tint relative flex min-w-0 flex-col items-center justify-center rounded-lg border px-1 transition duration-200 hover:z-10 hover:scale-[1.14] hover:shadow-lg focus-visible:z-10 ${dim ? "opacity-20 grayscale" : ""} ${glow ? "eq-glow" : ""}`}
              style={{ gridColumn: col, gridRow: row, ["--c" as string]: colorOf ? colorOf(e) : fam?.color ?? "#9AA0B5" }}>
              <span className="absolute left-1 top-0.5 font-mono text-[10px] text-muted">{e.number}</span>
              {state.seen.has(e.number) && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-fg/70" />}
              <span className="font-display text-xl font-extrabold leading-none sm:text-2xl">{e.symbol}</span>
              <span className="max-w-full truncate text-[9px] text-muted">{e.name}</span>
              {pct != null && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-1.5 font-mono text-[10px] font-bold leading-normal text-bg">
                  {fmtPct(pct)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
