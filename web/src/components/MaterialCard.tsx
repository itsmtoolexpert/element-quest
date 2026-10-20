import type { ElementSummary, Family, Material } from "../api";
import { fmtPct, PALETTE, prettyFormula } from "../lib/chem";

export function MaterialChip({ m, onPick }: { m: Material; onPick: (m: Material, el: HTMLElement) => void }) {
  return (
    <button onClick={(e) => onPick(m, e.currentTarget)}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold transition hover:border-accent">
      {m.name}
    </button>
  );
}

/** "What's inside" card: stacked bar plus one row per element. */
export default function MaterialCard({
  m, more, bySymbol, families, onOpenElement, onPickMaterial,
}: {
  m: Material; more: Material[]; bySymbol: Map<string, ElementSummary>; families: Map<string, Family>;
  onOpenElement: (e: ElementSummary, from: HTMLElement) => void; onPickMaterial: (m: Material, el: HTMLElement) => void;
}) {
  const rows = Object.entries(m.composition).filter(([s]) => bySymbol.has(s)).sort((a, b) => b[1] - a[1]);
  const other = Math.max(0, 100 - rows.reduce((s, r) => s + r[1], 0));
  const sub = m.kind === "element" ? "A single element, 100% pure."
    : m.kind === "compound" ? "A compound. Percentages are by mass, worked out from the formula."
    : "A mixture. Percentages are approximate, by mass.";
  const atoms = m.atoms && Object.keys(m.atoms).length > 1
    ? Object.entries(m.atoms).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${n} ${bySymbol.get(s)?.name.toLowerCase()}`).join(", ")
    : null;

  return (
    <section aria-live="polite" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-accent">What's inside</div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{m.name}</h2>
        {m.formula && <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-mono text-lg font-bold">{prettyFormula(m.formula)}</span>}
      </div>
      <p className="text-sm text-muted">{sub}</p>

      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        {rows.map(([s, p], i) => <i key={s} className="block h-full min-w-[3px]" style={{ width: `${p}%`, background: PALETTE[i % PALETTE.length] }} />)}
        {other > 0.4 && <i className="block h-full bg-line" style={{ width: `${other}%` }} />}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
        {rows.map(([s, p], i) => {
          const e = bySymbol.get(s)!;
          const fam = families.get(e.family_code);
          return (
            <button key={s} onClick={(ev) => onOpenElement(e, ev.currentTarget)}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-left hover:border-accent">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="tint grid size-9 shrink-0 place-items-center rounded-lg border font-display font-extrabold"
                style={{ ["--c" as string]: fam?.color }}>{s}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{e.name}</b>
                <small className="block truncate text-xs text-muted">{fam?.name}</small>
              </span>
              <span className="font-mono text-sm font-bold tabular-nums">{fmtPct(p)}</span>
            </button>
          );
        })}
        {other > 0.4 && (
          <div className="flex items-center gap-2.5 rounded-xl border border-line px-2.5 py-1.5">
            <span className="size-2.5 rounded-sm bg-line" />
            <span className="flex-1"><b className="block text-sm">Other / trace</b><small className="text-xs text-muted">Small amounts of other elements</small></span>
            <span className="font-mono text-sm font-bold">{fmtPct(other)}</span>
          </div>
        )}
      </div>

      {atoms && <p className="text-sm text-muted">In one unit: {atoms} atoms.</p>}
      {m.note && <p className="max-w-prose">{m.note}</p>}
      {m.source && <p className="text-xs text-muted">Source: {m.source}</p>}
      {more.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Also matches</span>
          {more.slice(0, 5).map((x) => <MaterialChip key={x.id} m={x} onPick={onPickMaterial} />)}
        </div>
      )}
      <p className="text-sm text-muted">Tap an element above, or a glowing tile in the table, to open its file.</p>
    </section>
  );
}
