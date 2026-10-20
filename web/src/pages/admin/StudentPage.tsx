import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

import { api, type Level } from "../../api";
import ActivityBars from "../../components/ActivityBars";
import Avatar from "../../components/Avatar";
import PeriodicTable from "../../components/PeriodicTable";
import { quizModeLabel, relativeTime } from "../../lib/time";
import { LEVEL_COLORS } from "../PracticePage";

const LEVEL_TEXT: Record<Level, string> = { unexplored: "Not explored", learning: "Learning", reviewing: "Remembering", mastered: "Mastered" };

export default function StudentPage() {
  const id = Number(useParams().id);
  const s = useQuery({ queryKey: ["admin", "student", id], queryFn: () => api.admin.student(id) });
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const families = useQuery({ queryKey: ["families"], queryFn: api.families });
  const famMap = useMemo(() => new Map((families.data ?? []).map((f) => [f.code, f])), [families.data]);

  if (s.isPending) return <p className="text-muted">Loading…</p>;
  if (s.isError) return <p className="text-bad">Couldn't load that student.</p>;
  const d = s.data;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/" className="flex w-max items-center gap-2 font-bold text-muted hover:text-fg"><ArrowLeft size={16} /> Dashboard</Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar avatar={d.avatar} size={64} />
        <div>
          <h2 className="font-display text-3xl font-extrabold">{d.display_name}</h2>
          <p className="text-muted">@{d.username}{d.grade ? ` · Grade ${d.grade}` : ""} · last active {relativeTime(d.last_active).toLowerCase()}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Streak" value={`${d.streak_days} day${d.streak_days === 1 ? "" : "s"}`} />
        <Tile label="Explored" value={`${d.explored}/118`} />
        <Tile label="Mastered" value={`${d.mastered}/118`} />
        <Tile label="Due now" value={String(d.due_now)} />
        <Tile label="Right this week" value={d.accuracy_7d != null ? `${Math.round(d.accuracy_7d * 100)}%` : "—"} />
      </dl>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h3 className="mb-2 font-display text-lg font-bold">Last 30 days</h3>
        <ActivityBars days={d.activity} height={96} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-bold">Mastery map</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEVEL_COLORS) as Level[]).map((lv) => (
            <span key={lv} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold">
              <span className="size-3 rounded-full" style={{ background: LEVEL_COLORS[lv] }} />{LEVEL_TEXT[lv]}
              <span className="font-mono text-muted">{d.level_counts[lv]}</span>
            </span>
          ))}
        </div>
        {elements.data && famMap.size > 0 && (
          <PeriodicTable elements={elements.data} families={famMap} showPreview={false}
            colorOf={(e) => LEVEL_COLORS[d.levels[String(e.number)] ?? "unexplored"]}
            describe={(e) => LEVEL_TEXT[d.levels[String(e.number)] ?? "unexplored"].toLowerCase()}
            state={{ visible: new Set(elements.data.filter((e) => d.levels[String(e.number)] !== "unexplored").map((e) => e.number)),
              glowing: new Set(), pct: new Map(), seen: new Set() }}
            onPick={() => {}} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h3 className="mb-2 font-display text-lg font-bold">Elements to practice</h3>
          {d.trouble.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-1.5">Element</th><th className="text-right">Right</th><th className="text-right">Wrong</th><th className="text-right">Score</th></tr></thead>
              <tbody>
                {d.trouble.map((t) => (
                  <tr key={t.number} className="border-t border-line">
                    <td className="py-2"><b>{t.symbol}</b> {t.name}</td>
                    <td className="text-right font-mono">{t.right}</td>
                    <td className="text-right font-mono">{t.wrong}</td>
                    <td className="text-right font-mono">{Math.round((t.right / (t.right + t.wrong)) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">Nothing missed in the last 30 days.</p>}
        </section>

        <section className="rounded-3xl border border-line bg-surface p-5">
          <h3 className="mb-2 font-display text-lg font-bold">Recent quizzes</h3>
          {d.recent_quizzes.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-1.5">When</th><th>Round</th><th className="text-right">Score</th></tr></thead>
              <tbody>
                {d.recent_quizzes.map((q, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2">{relativeTime(q.created_at)}</td>
                    <td>{quizModeLabel(q.mode)}</td>
                    <td className="text-right font-mono">{q.score}/{q.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">No quizzes yet.</p>}
        </section>
      </div>

      <section>
        <h3 className="mb-2 font-display text-lg font-bold">Badges</h3>
        {d.badges.length ? (
          <div className="flex flex-wrap gap-2">
            {d.badges.map((b) => <span key={b.code} className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold">{b.label}</span>)}
          </div>
        ) : <p className="text-muted">No badges yet.</p>}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-mono text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
