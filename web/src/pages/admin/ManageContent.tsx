import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { api, type ElementDetail } from "../../api";
import { useToast } from "../../components/Toast";
import { Btn, ErrorText, Field, Input, Panel, TextArea } from "../../components/ui";

/** Edit the words students see in each element file, and its quick-check question. */
export default function ManageContent() {
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const [n, setN] = useState(26);
  const detail = useQuery({ queryKey: ["element", n], queryFn: () => api.element(n) });

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-end gap-2">
          <Btn variant="ghost" aria-label="Previous element" disabled={n <= 1} onClick={() => setN(n - 1)}><ArrowLeft size={16} /></Btn>
          <div className="min-w-56 flex-1">
            <Field label="Element">
              <select value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full rounded-xl border border-line bg-bg px-3 py-2">
                {elements.data?.map((e) => (
                  <option key={e.number} value={e.number}>{e.number} · {e.symbol} · {e.name}{e.featured ? " ★" : ""}</option>
                ))}
              </select>
            </Field>
          </div>
          <Btn variant="ghost" aria-label="Next element" disabled={n >= 118} onClick={() => setN(n + 1)}><ArrowRight size={16} /></Btn>
        </div>
        <p className="mt-2 text-sm text-muted">★ = featured: shows a "Try it" activity, can be element of the day, and is favored by Surprise me.</p>
      </Panel>
      {detail.data && detail.data.number === n && <Editor key={n} e={detail.data} />}
    </div>
  );
}

function Editor({ e }: { e: ElementDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const c = e.content;
  const cq = c?.check_question;
  const [f, setF] = useState({
    everyday_use: c?.everyday_use ?? "",
    go_deeper: c?.go_deeper ?? "",
    try_it: c?.try_it ?? "",
    featured: c?.featured ?? false,
    hasQ: !!cq,
    question: cq?.question ?? "", correct: cq?.correct ?? "",
    w1: cq?.wrong[0] ?? "", w2: cq?.wrong[1] ?? "", w3: cq?.wrong[2] ?? "",
    explanation: cq?.explanation ?? "",
  });
  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });

  const save = useMutation({
    mutationFn: () => api.admin.saveContent(e.number, {
      everyday_use: f.everyday_use, go_deeper: f.go_deeper || null, try_it: f.try_it || null, featured: f.featured,
      check_question: f.hasQ ? { question: f.question, correct: f.correct, wrong: [f.w1, f.w2, f.w3], explanation: f.explanation } : null,
    }),
    onSuccess: () => {
      toast(`${e.name} saved`);
      qc.invalidateQueries({ queryKey: ["element", e.number] });
      qc.invalidateQueries({ queryKey: ["elements"] });
    },
  });
  const submit = (ev: FormEvent) => { ev.preventDefault(); save.mutate(); };

  return (
    <Panel>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3" style={{ ["--c" as string]: e.family.color }}>
          <span className="tint grid size-14 place-items-center rounded-xl border-2 font-display text-2xl font-extrabold">{e.symbol}</span>
          <div>
            <h3 className="font-display text-xl font-bold">{e.name}</h3>
            <p className="text-sm text-muted">{e.family.name} · {e.electron_config} · {e.valence_electrons ?? "varies"} valence electrons</p>
          </div>
        </div>
        <Field label="Where you'll meet it" hint="Short phrase, no full stop. Also used for 'Which element is used for…' questions.">
          <Input required minLength={3} maxLength={300} value={f.everyday_use} onChange={set("everyday_use")} />
        </Field>
        <Field label="Go deeper" hint="Leave empty to show the family description instead.">
          <TextArea maxLength={1200} value={f.go_deeper} onChange={set("go_deeper")} />
        </Field>
        <Field label="Try it / spot it" hint="A safe activity at home. Leave empty to hide the box.">
          <TextArea maxLength={800} value={f.try_it} onChange={set("try_it")} />
        </Field>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={f.featured} onChange={(ev) => setF({ ...f, featured: ev.target.checked })} className="size-5 accent-[var(--accent)]" />
          Featured element
        </label>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <legend className="px-1 font-bold">Quick-check question</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.hasQ} onChange={(ev) => setF({ ...f, hasQ: ev.target.checked })} className="size-5 accent-[var(--accent)]" />
            Use a custom question (otherwise the app asks about valence or protons)
          </label>
          {f.hasQ && (
            <>
              <Field label="Question"><Input required minLength={5} value={f.question} onChange={set("question")} /></Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Right answer"><Input required value={f.correct} onChange={set("correct")} /></Field>
                <Field label="Wrong answer 1"><Input required value={f.w1} onChange={set("w1")} /></Field>
                <Field label="Wrong answer 2"><Input required value={f.w2} onChange={set("w2")} /></Field>
                <Field label="Wrong answer 3"><Input required value={f.w3} onChange={set("w3")} /></Field>
              </div>
              <Field label="Explanation (shown after answering)"><TextArea required value={f.explanation} onChange={set("explanation")} /></Field>
            </>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Btn type="submit" disabled={save.isPending}><Save size={16} /> Save {e.name}</Btn>
          <ErrorText error={save.error} />
        </div>
      </form>
    </Panel>
  );
}
