import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { api, type Collection, type ElementSummary } from "../../api";
import { useToast } from "../../components/Toast";
import { Btn, ErrorText, Field, Input, Panel, TextArea } from "../../components/ui";

/** "Find elements in" sets, like Your phone or Kitchen. */
export default function ManageFinders() {
  const collections = useQuery({ queryKey: ["collections"], queryFn: api.collections });
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const bySym = useMemo(() => new Map((elements.data ?? []).map((e) => [e.symbol.toLowerCase(), e])), [elements.data]);

  return (
    <div className="flex flex-col gap-4">
      <FinderForm key="new" bySym={bySym} />
      {collections.data?.map((c) => <FinderForm key={c.slug} c={c} bySym={bySym} />)}
    </div>
  );
}

function FinderForm({ c, bySym }: { c?: Collection; bySym: Map<string, ElementSummary> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [label, setLabel] = useState(c?.label ?? "");
  const [note, setNote] = useState(c?.note ?? "");
  const [symbols, setSymbols] = useState(c?.symbols.join(", ") ?? "");
  const parsed = symbols.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const unknown = parsed.filter((s) => !bySym.has(s.toLowerCase()));
  const body = () => ({ label, note, symbols: parsed });
  const refresh = () => qc.invalidateQueries({ queryKey: ["collections"] });

  const save = useMutation({
    mutationFn: () => (c ? api.admin.updateCollection(c.slug, body()) : api.admin.createCollection(body())),
    onSuccess: (x) => { toast(`${x.label} saved`); refresh(); if (!c) { setLabel(""); setNote(""); setSymbols(""); } },
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteCollection(c!.slug),
    onSuccess: () => { toast(`${c!.label} removed`); refresh(); },
  });

  return (
    <Panel>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-bold">{c ? c.label : "New finder"}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
          <Field label="Button label"><Input required maxLength={64} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Your bike" /></Field>
          <Field label="Note shown when it's picked"><TextArea rows={2} required maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <Field label="Element symbols" hint="Separate with commas or spaces, e.g. Al, Ti, C, Fe">
          <Input required value={symbols} onChange={(e) => setSymbols(e.target.value)} className="font-mono" />
        </Field>
        {parsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-sm">
            {parsed.map((s, i) => {
              const e = bySym.get(s.toLowerCase());
              return (
                <span key={`${s}-${i}`} className={`rounded-full border px-2.5 py-0.5 ${e ? "border-line" : "border-bad text-bad"}`}>
                  {e ? <><b>{e.symbol}</b> {e.name}</> : <>{s}? not an element</>}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Btn type="submit" disabled={save.isPending || unknown.length > 0}>{c ? <Save size={16} /> : <Plus size={16} />} {c ? "Save" : "Add finder"}</Btn>
          {c && (
            <Btn type="button" variant="ghost" disabled={remove.isPending}
              onClick={() => confirm(`Remove the "${c.label}" finder?`) && remove.mutate()}><Trash2 size={16} /> Remove</Btn>
          )}
          <ErrorText error={save.error || remove.error} />
        </div>
      </form>
    </Panel>
  );
}
