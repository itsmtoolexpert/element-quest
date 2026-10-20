import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { api, type User } from "../api";
import Avatar from "../components/Avatar";
import ExplorePage from "./ExplorePage";

export default function HomePage({ user }: { user: User }) {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["stats", "me"], queryFn: api.myStats });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { qc.clear(); qc.setQueryData(["me"], null); },
  });

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-16 pt-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar avatar={user.avatar} size={52} />
          <div>
            <p className="text-sm text-muted">Hi {user.display_name}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Element <span className="rainbow-text">Quest</span>
            </h1>
          </div>
        </div>
        <button onClick={() => logout.mutate()} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 font-bold">
          <LogOut size={16} /> Sign out
        </button>
      </header>

      {user.role === "student" ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your progress">
          <Stat label="Explored" value={`${stats.data?.explored ?? 0} / 118`} bar={(stats.data?.explored ?? 0) / 118} />
          <Stat label="Mastered" value={String(stats.data?.mastered ?? 0)} hint="Practice arrives next" />
          <Stat label="Due today" value={String(stats.data?.due_today ?? 0)} hint="Practice arrives next" />
          <Stat label="Streak" value={`${stats.data?.streak_days ?? 0} day${stats.data?.streak_days === 1 ? "" : "s"}`} />
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-4 text-muted">
          The parent/teacher dashboard and content editor arrive in milestone 4. For now you can explore everything students see.
        </p>
      )}

      <ExplorePage user={user} />
    </div>
  );
}

function Stat({ label, value, bar, hint }: { label: string; value: string; bar?: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3" title={hint}>
      <span className="text-[11px] uppercase tracking-widest text-muted">{label}</span>
      <b className="block font-mono text-xl tabular-nums">{value}</b>
      {bar != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <i className="block h-full rounded-full bg-gradient-to-r from-[#4CC9F0] via-[#7B61FF] to-accent transition-[width] duration-500" style={{ width: `${bar * 100}%` }} />
        </div>
      )}
    </div>
  );
}
