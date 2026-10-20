import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

import { api, type Material, type MaterialIn } from "../../api";
import { useToast } from "../../components/Toast";
import { Btn, ErrorText, Field, Input, Panel, TextArea } from "../../components/ui";
import { fmtPct, materialScore, norm, PALETTE, prettyFormula } from "../../lib/chem";

/** The "What's inside" library: add, edit and remove materials. */
export default function ManageMaterials() {
  const materials = useQuery({ queryKey: ["materials"], queryFn: api.materials });
  const [params, setParams] = useSearchParams();
  const prefill = params.get("new");
  const [selected, setSelected] = useState<number | "new" | null>(prefill ? "new" : null);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const q = norm(filter);
    const all = materials.data ?? [];
    return q ? all.filter((m) => materialScore(m, q) > 0) : all;
  }, [materials.data, filter]);
  const current = typeof selected === "number" ? materials.data?.find((m) => m.id === selected) : undefined;

  function close() { setSelected(null); if (prefill) setParams({}); }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <Panel className="flex max-h-[70vh] flex-col gap-3 lg:sticky lg:top-4">
        <Btn onClick={() => setSelected("new")}><Plus size={16} /> New material</Btn>
        <Input placeholder={`Filter ${materials.data?.length ?? ""} materials…`} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <ul className="-mx-2 overflow-y-auto">
          {list.map((m) => (
            <li key={m.id}>
              <button onClick={() => setSelected(m.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left ${selected === m.id ? "bg-surface-2 font-bold" : "hover:bg-surface-2"}`}>
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted">{m.formula ? prettyFormula(m.formula) : "mix"}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <div>
        {selected === "new" && <MaterialEditor key={`new-${prefill ?? ""}`} initialName={prefill ?? ""} onDone={close} />}
        {current && <MaterialEditor key={current.id} m={current} onDone={close} />}
        {selected === null && <p className="p-5 text-muted">Pick a material to edit, or add a new one.</p>}
      </div>
    </div>
  );
}

type Row = { sym: string; pct: string };

function MaterialEditor({ m, initialName = "", onDone }: { m?: Material; initialName?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(m?.name ?? initialName.replace(/\b\w/g, (c) => c.toUpperCase()));
  const [aliases, setAliases] = useState((m?.aliases ?? (initialName ? [initialName.toLowerCase()] : [])).join(", "));
  const [mode, setMode] = useState<"formula" | "mixture">(m && !m.formula ? "mixture" : "formula");
  const [formula, setFormula] = useState(m?.formula ?? "");
  const [rows, setRows] = useState<Row[]>(m && !m.formula ? Object.entries(m.composition).map(([sym, p]) => ({ sym, pct: String(p) })) : [{ sym: "", pct: "" }]);
  const [note, setNote] = useState(m?.note ?? "");
  const [source, setSource] = useState(m?.source ?? "");
  const [featured, setFeatured] = useState(m?.featured ?? false);
  const [preview, setPreview] = useState<Record<string, number> | null>(m?.formula ? m.composition : null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  // Work out the composition as the formula is typed.
  useEffect(() => {
    if (mode !== "formula" || !formula.trim()) { setPreview(null); setPreviewErr(null); return; }
    const t = setTimeout(() => {
      api.admin.previewFormula(formula).then((r) => { setPreview(r.composition); setPreviewErr(null); })
        .catch((e: Error) => { setPreview(null); setPreviewErr(e.message); });
    }, 350);
    return () => clearTimeout(t);
  }, [formula, mode]);

  const mixTotal = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
  const body = (): MaterialIn => ({
    name, aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean), note: note || null, source: source || null, featured,
    ...(mode === "formula" ? { formula } : {
      composition: Object.fromEntries(rows.filter((r) => r.sym.trim() && parseFloat(r.pct) > 0).map((r) => [r.sym.trim(), parseFloat(r.pct)])),
    }),
  });

  const done = (msg: string) => { toast(msg); qc.invalidateQueries({ queryKey: ["materials"] }); qc.invalidateQueries({ queryKey: ["admin", "misses"] }); };
  const save = useMutation({
    mutationFn: () => (m ? api.admin.updateMaterial(m.id, body()) : api.admin.createMaterial(body())),
    onSuccess: (x) => { done(`${x.name} saved`); if (!m) onDone(); },
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteMaterial(m!.id),
    onSuccess: () => { done(`${m!.name} removed`); onDone(); },
  });

  const comp = mode === "formula" ? preview : Object.fromEntries(rows.filter((r) => r.sym && parseFloat(r.pct) > 0).map((r) => [r.sym, parseFloat(r.pct)]));

  return (
    <Panel>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold">{m ? `Edit ${m.name}` : "New material"}</h3>
          <button type="button" onClick={onDone} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-surface-2"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required maxLength={64} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Other names students might type" hint="Comma-separated, e.g. salt, sodium chloride">
            <Input value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </Field>
        </div>

        <div className="flex w-max gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Kind">
          {(["formula", "mixture"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${mode === k ? "bg-surface shadow" : "text-muted"}`}>
              {k === "formula" ? "One substance (formula)" : "Mixture (percentages)"}
            </button>
          ))}
        </div>

        {mode === "formula" ? (
          <Field label="Chemical formula" hint="Case matters: CO is carbon monoxide, Co is cobalt. Brackets and hydrates work: Ca5(PO4)3OH, CuSO4·5H2O">
            <Input required value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="e.g. NaHCO3" className="font-mono" />
          </Field>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">Elements by mass</span>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input aria-label="Element symbol" placeholder="Fe" value={r.sym} className="w-24 font-mono"
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sym: e.target.value.trim() } : x)))} />
                <Input aria-label="Percent by mass" inputMode="decimal" placeholder="%" value={r.pct} className="w-28 font-mono"
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
                <button type="button" aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2"><X size={16} /></button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Btn type="button" variant="ghost" onClick={() => setRows([...rows, { sym: "", pct: "" }])}><Plus size={16} /> Add element</Btn>
              <span className={`text-sm ${mixTotal > 100.5 || mixTotal < 50 ? "text-bad" : "text-muted"}`}>Total {mixTotal.toFixed(1)}% (should be about 100%)</span>
            </div>
          </div>
        )}

        {previewErr && <p className="text-sm text-bad">{previewErr}</p>}
        {comp && Object.keys(comp).length > 0 && <CompositionPreview comp={comp} />}

        <Field label="Note for students" hint="1–2 friendly sentences about what it's made of and why.">
          <TextArea maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Source (optional)"><Input maxLength={200} value={source} onChange={(e) => setSource(e.target.value)} /></Field>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          Show as a quick-tap example under the search box
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Btn type="submit" disabled={save.isPending}><Save size={16} /> Save</Btn>
          {m && (
            <Btn type="button" variant="ghost" disabled={remove.isPending}
              onClick={() => confirm(`Remove ${m.name} from the library?`) && remove.mutate()}>
              <Trash2 size={16} /> Remove
            </Btn>
          )}
          <ErrorText error={save.error || remove.error} />
        </div>
      </form>
    </Panel>
  );
}

function CompositionPreview({ comp }: { comp: Record<string, number> }) {
  const rows = Object.entries(comp).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
        {rows.map(([s, p], i) => <i key={s} className="block h-full" style={{ width: `${p}%`, background: PALETTE[i % PALETTE.length] }} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {rows.map(([s, p], i) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} /><b>{s}</b> <span className="font-mono">{fmtPct(p)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
