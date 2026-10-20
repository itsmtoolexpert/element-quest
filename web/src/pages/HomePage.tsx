import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useMemo, useState } from "react";

import { api, type User } from "../api";
import Avatar from "../components/Avatar";
import ElementSheet from "../components/ElementSheet";
import PeriodicTable from "../components/PeriodicTable";

export default function HomePage({ user }: { user: User }) {
  const qc = useQueryClient();
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const families = useQuery({ queryKey: ["families"], queryFn: api.families });
  const stats = useQuery({ queryKey: ["stats", "me"], queryFn: api.myStats });
  const [open, setOpen] = useState<string | null>(null);
  const famMap = useMemo(() => new Map((families.data ?? []).map((f) => [f.code, f])), [families.data]);

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

      {user.role === "student" && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your progress">
          <Stat label="Explored" value={`${stats.data?.explored ?? 0} / 118`} />
          <Stat label="Mastered" value={String(stats.data?.mastered ?? 0)} />
          <Stat label="Due today" value={String(stats.data?.due_today ?? 0)} />
          <Stat label="Streak" value={`${stats.data?.streak_days ?? 0} days`} />
        </section>
      )}
      {user.role === "admin" && (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-4 text-muted">
          The parent/teacher dashboard and content editor arrive in milestone 4. For now you can browse the table.
        </p>
      )}

      {elements.data && famMap.size > 0 ? (
        <>
          <ul className="flex flex-wrap gap-2" aria-label="Families">
            {families.data!.map((f) => (
              <li key={f.code} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-bold">
                <span className="size-3 rounded-full" style={{ background: f.color }} />{f.short_name}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted md:hidden">Swipe sideways on the table to see all 18 groups.</p>
          <PeriodicTable elements={elements.data} families={famMap} onPick={(e) => setOpen(e.symbol)} />
        </>
      ) : (
        <p className="text-muted">{elements.isError ? "Couldn't load the elements." : "Loading the periodic table…"}</p>
      )}

      <ElementSheet symbol={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <span className="text-[11px] uppercase tracking-widest text-muted">{label}</span>
      <b className="block font-mono text-xl tabular-nums">{value}</b>
    </div>
  );
}
