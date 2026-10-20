import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Flame, SearchX } from "lucide-react";
import { Link } from "react-router";

import { api, type StudentSummary } from "../../api";
import ActivityBars from "../../components/ActivityBars";
import Avatar from "../../components/Avatar";
import { relativeTime } from "../../lib/time";

export default function DashboardPage() {
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: api.admin.overview, refetchInterval: 60_000 });
  const misses = useQuery({ queryKey: ["admin", "misses"], queryFn: api.admin.misses });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold">How everyone's doing</h2>
        <p className="text-sm text-muted">Updates every minute. Days are counted in Mountain Time.</p>
      </div>

      {overview.isPending && <p className="text-muted">Loading progress…</p>}
      {overview.isError && <p className="text-bad">Couldn't load progress.</p>}
      {overview.data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-4 text-muted">
          No students yet. <Link to="/manage/students" className="font-bold text-accent">Add one</Link>.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {overview.data?.map((s) => <StudentCard key={s.id} s={s} />)}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold"><SearchX size={20} /> Searches that found nothing</h3>
          <Link to="/manage/searches" className="flex items-center gap-1 text-sm font-bold text-accent">Review all <ChevronRight size={16} /></Link>
        </div>
        {misses.data?.length ? (
          <ul className="flex flex-wrap gap-2">
            {misses.data.slice(0, 8).map((m) => (
              <li key={m.query} className="rounded-full border border-line bg-bg px-3 py-1.5 text-sm">
                <b>{m.query}</b> <span className="text-muted">· {m.count}× · {m.students.join(", ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{misses.isPending ? "Loading…" : "None yet. Every search has matched something."}</p>
        )}
      </section>
    </div>
  );
}

function StudentCard({ s }: { s: StudentSummary }) {
  const acc = s.accuracy_7d != null ? `${Math.round(s.accuracy_7d * 100)}% right` : "no cards yet";
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <header className="flex items-center gap-3">
        <Avatar avatar={s.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl font-bold">{s.display_name}</h3>
          <p className="text-sm text-muted">Last active: {relativeTime(s.last_active)}</p>
        </div>
        {s.streak_days > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,#FF924C_20%,var(--surface))] px-3 py-1 text-sm font-bold">
            <Flame size={16} color="#FF924C" /> {s.streak_days} day{s.streak_days > 1 ? "s" : ""}
          </span>
        )}
      </header>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Mini label="Explored" value={`${s.explored}/118`} />
        <Mini label="Mastered" value={`${s.mastered}/118`} />
        <Mini label="Due now" value={String(s.due_now)} />
      </dl>

      <div>
        <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-bold">Last 14 days</span>
          <span className="text-muted">This week: {s.reviews_7d} cards ({acc}) · {s.quizzes_7d} quiz{s.quizzes_7d === 1 ? "" : "zes"}</span>
        </div>
        <ActivityBars days={s.activity} />
      </div>

      <div>
        <div className="mb-1.5 text-sm font-bold">Needs practice</div>
        {s.trouble.length ? (
          <div className="flex flex-wrap gap-1.5">
            {s.trouble.map((t) => (
              <span key={t.number} className="rounded-full border border-line px-2.5 py-1 text-sm" title={`${t.right} right, ${t.wrong} wrong in the last 30 days`}>
                <b>{t.symbol}</b> {t.name} <span className="font-mono text-muted">{t.right}/{t.right + t.wrong}</span>
              </span>
            ))}
          </div>
        ) : <p className="text-sm text-muted">Nothing missed in the last 30 days.</p>}
      </div>

      <Link to={`/students/${s.id}`} className="flex items-center gap-1 self-end font-bold text-accent">
        Details <ChevronRight size={18} />
      </Link>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-mono text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}
