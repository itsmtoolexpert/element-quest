import { FlaskConical, Search, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

import type { ElementSummary, Family, Material } from "../api";
import { norm, suggest, type Suggestion } from "../lib/chem";

/**
 * Search box with a live suggestion list (ARIA combobox). Suggestions update on every keystroke
 * and mix elements and "What's inside" materials.
 */
export default function SearchBox({
  value, onChange, elements, materials, families, onPickElement, onPickMaterial, onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  elements: ElementSummary[];
  materials: Material[];
  families: Map<string, Family>;
  onPickElement: (e: ElementSummary, from: HTMLElement | null) => void;
  onPickMaterial: (m: Material) => void;
  onEnter: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const items = useMemo(() => suggest(norm(value), elements, materials), [value, elements, materials]);
  const showList = open && items.length > 0;

  function pick(s: Suggestion, el: HTMLElement | null) {
    setOpen(false);
    setActive(-1);
    if (s.kind === "element") onPickElement(s.element, el);
    else onPickMaterial(s.material);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && active >= 0) pick(items[active], document.getElementById(`${id}-opt-${active}`));
      else { setOpen(false); onEnter(); }
    }
  }

  return (
    <div className="relative min-w-0 flex-1 basis-60">
      <label className="relative block">
        <span className="sr-only">Search elements or everyday things</span>
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder="Search an element or anything: Fe, 26, diamond, air, sugar…"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-11 text-base"
        />
        {value && (
          <button type="button" aria-label="Clear search" onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2">
            <X size={16} />
          </button>
        )}
      </label>

      {showList && (
        <ul id={`${id}-list`} role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[60vh] overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {items.map((s, i) => {
            const isEl = s.kind === "element";
            const color = isEl ? families.get(s.element.family_code)?.color ?? "#9AA0B5" : "var(--accent-2)";
            return (
              <li key={isEl ? `e${s.element.number}` : `m${s.material.id}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); pick(s, e.currentTarget); }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? "bg-surface-2" : ""}`}>
                <span className="tint grid size-9 shrink-0 place-items-center rounded-lg border font-display font-extrabold"
                  style={{ ["--c" as string]: color }}>
                  {isEl ? s.element.symbol : <FlaskConical size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{isEl ? s.element.name : s.material.name}</b>
                  <small className="block truncate text-muted">
                    {isEl ? `Element #${s.element.number} · ${families.get(s.element.family_code)?.name ?? ""}`
                      : `What's inside · ${Object.keys(s.material.composition).slice(0, 4).join(", ")}`}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
