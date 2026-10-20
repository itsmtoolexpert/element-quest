import { useQuery } from "@tanstack/react-query";
import { Compass, Layers, Shuffle, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { api, type Level } from "../api";
import ElementSheet from "../components/ElementSheet";
import PeriodicTable from "../components/PeriodicTable";

export const LEVEL_COLORS: Record<Level, string> = {
  unexplored: "#9AA0B5",
  learning: "#FFCA3A",
  reviewing: "#4CC9F0",
  mastered: "#14A44D",
};
const LEVEL_TEXT: Record<Level, string> = {
  unexplored: "Not explored yet",
  learning: "Learning",
  reviewing: "Remembering",
  mastered: "Mastered",
};

export default function PracticePage() {
  const navigate = useNavigate();
  const stats = useQuery({ queryKey: ["stats", "me"], queryFn: api.myStats });
  const mastery = useQuery({ queryKey: ["mastery"], queryFn: api.mastery });
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const families = useQuery({ queryKey: ["families"], queryFn: api.families });
  const materials = useQuery({ queryKey: ["materials"], queryFn: api.materials });
  const [open, setOpen] = useState<number | null>(null);
  const famMap = useMemo(() => new Map((families.data ?? []).map((f) => [f.code, f])), [families.data]);
  const due = stats.data?.due_today ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Today's review */}
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-white"><Layers size={30} /></div>
        <div className="min-w-0 flex-1 basis-64">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Today's review</div>
          <h2 className="font-display text-2xl font-extrabold">
            {stats.isPending ? "…" : due > 0 ? `${due} card${due === 1 ? "" : "s"} due` : "All caught up!"}
          </h2>
          <p className="text-muted">
            {due > 0 ? "A few minutes a day keeps every element fresh. Missed cards come back sooner; easy ones wait longer."
              : "Explore new elements to add cards, or try a quiz below."}
          </p>
        </div>
        {due > 0 ? (
          <Link to="/practice/review" className="rounded-full bg-accent px-6 py-3 text-lg font-bold text-white transition hover:scale-[1.03]">Start review</Link>
        ) : (
          <Link to="/" className="rounded-full bg-surface-2 px-6 py-3 font-bold">Explore elements</Link>
        )}
      </section>

      {/* Quizzes */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Quiz rounds</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuizCard to="/practice/quiz/weak" icon={<Target size={22} />} title="My weak spots" text="Elements you've been missing." color="#FF595E" />
          <QuizCard to="/practice/quiz/explored" icon={<Compass size={22} />} title="Elements I've explored" text="Everything you've opened so far." color="#7B61FF" />
          <QuizCard to="/practice/quiz/mixed" icon={<Shuffle size={22} />} title="Mixed challenge" text="Anything from the first 86 elements." color="#2EC4B6" />
        </div>
        <ChipRow label="By family">
          {(families.data ?? []).filter((f) => f.code !== "uk").map((f) => (
            <Link key={f.code} to={`/practice/quiz/family:${f.code}`}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold hover:border-accent">
              <span className="size-3 rounded-full" style={{ background: f.color }} />{f.short_name}
            </Link>
          ))}
        </ChipRow>
        <ChipRow label="By period">
          {Array.from({ length: 7 }, (_, p) => <NumChip key={p} to={`/practice/quiz/period:${p + 1}`}>{p + 1}</NumChip>)}
        </ChipRow>
        <ChipRow label="By group">
          <select aria-label="Quiz by group" defaultValue=""
            onChange={(e) => e.target.value && navigate(`/practice/quiz/group:${e.target.value}`)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold">
            <option value="" disabled>Pick a group…</option>
            {Array.from({ length: 18 }, (_, g) => <option key={g} value={g + 1}>Group {g + 1}</option>)}
          </select>
        </ChipRow>
      </section>

      {/* Mastery map */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Your mastery map</h2>
          <p className="text-sm text-muted">An element is mastered when you remember all its cards for 3 weeks or more.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEVEL_COLORS) as Level[]).map((lv) => (
            <span key={lv} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold">
              <span className="size-3 rounded-full" style={{ background: LEVEL_COLORS[lv] }} />
              {LEVEL_TEXT[lv]} <span className="font-mono text-muted">{mastery.data?.counts[lv] ?? 0}</span>
            </span>
          ))}
        </div>
        {elements.data && mastery.data && famMap.size > 0 ? (
          <PeriodicTable elements={elements.data} families={famMap} showPreview={false}
            colorOf={(e) => LEVEL_COLORS[mastery.data.levels[String(e.number)] ?? "unexplored"]}
            describe={(e) => LEVEL_TEXT[mastery.data.levels[String(e.number)] ?? "unexplored"].toLowerCase()}
            state={{
              visible: new Set(elements.data.filter((e) => mastery.data.levels[String(e.number)] !== "unexplored").map((e) => e.number)),
              glowing: new Set(), pct: new Map(), seen: new Set(),
            }}
            onPick={(e) => setOpen(e.number)} />
        ) : <p className="text-muted">Loading your map…</p>}
      </section>

      <ElementSheet number={open} elements={elements.data ?? []} materials={materials.data ?? []}
        onNavigate={setOpen} onClose={() => setOpen(null)} onPickMaterial={() => { setOpen(null); navigate("/"); }} />
    </div>
  );
}

function QuizCard({ to, icon, title, text, color }: { to: string; icon: React.ReactNode; title: string; text: string; color: string }) {
  return (
    <Link to={to} className="tint flex items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ ["--c" as string]: color }}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface" style={{ color }}>{icon}</span>
      <span><b className="block font-display text-lg">{title}</b><small className="text-muted">{text}</small></span>
    </Link>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-xs font-bold uppercase tracking-widest text-muted">{label}</span>
      {children}
    </div>
  );
}

function NumChip({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link to={to} className="grid size-9 place-items-center rounded-full border border-line bg-surface font-mono font-bold hover:border-accent">{children}</Link>;
}

