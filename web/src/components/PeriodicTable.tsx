import type { ElementSummary, Family } from "../api";

/** Grid position: main table rows 1–7, then the lanthanide/actinide rows 9–10 (row 8 is a gap). */
function place(e: ElementSummary): { col: number; row: number } {
  if (e.group != null) return { col: e.group, row: e.period };
  const offset = e.period === 6 ? e.number - 57 : e.number - 89;
  return { col: offset + 3, row: e.period + 3 };
}

export default function PeriodicTable({
  elements, families, onPick,
}: { elements: ElementSummary[]; families: Map<string, Family>; onPick: (e: ElementSummary) => void }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface p-3">
      <div
        className="grid w-max gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(18, clamp(44px, 5.1vw, 64px))",
          gridTemplateRows: "repeat(7, clamp(48px, 5.6vw, 70px)) 12px repeat(2, clamp(48px, 5.6vw, 70px))",
        }}
      >
        {elements.map((e) => {
          const { col, row } = place(e);
          const fam = families.get(e.family_code);
          return (
            <button
              key={e.number}
              onClick={() => onPick(e)}
              title={`${e.name} (${fam?.name ?? ""})`}
              aria-label={`${e.name}, ${e.symbol}, atomic number ${e.number}`}
              className="tint relative flex flex-col items-center justify-center rounded-lg border px-1 transition hover:z-10 hover:scale-110 hover:shadow-lg focus-visible:z-10"
              style={{ gridColumn: col, gridRow: row, ["--c" as string]: fam?.color ?? "#9AA0B5" }}
            >
              <span className="absolute left-1 top-0.5 font-mono text-[10px] text-muted">{e.number}</span>
              <span className="font-display text-xl font-extrabold leading-none sm:text-2xl">{e.symbol}</span>
              <span className="max-w-full truncate text-[9px] text-muted">{e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
