import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Dumbbell, KeyRound, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { NavLink, Route, Routes } from "react-router";

import { api, type User } from "../api";
import Avatar from "../components/Avatar";
import PasswordDialog from "../components/PasswordDialog";
import DashboardPage from "./admin/DashboardPage";
import ManagePage from "./admin/ManagePage";
import StudentPage from "./admin/StudentPage";
import ExplorePage from "./ExplorePage";
import PracticePage from "./PracticePage";
import QuizSession from "./QuizSession";
import ReviewSession from "./ReviewSession";

export default function HomePage({ user }: { user: User }) {
  const qc = useQueryClient();
  const isAdmin = user.role === "admin";
  const stats = useQuery({ queryKey: ["stats", "me"], queryFn: api.myStats, enabled: !isAdmin });
  const [pwOpen, setPwOpen] = useState(false);

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(["me"], null);
      if ("caches" in window) caches.delete("eq-session").catch(() => {});
    },
  });
  const due = stats.data?.due_today ?? 0;

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
        <div className="flex gap-2">
          <button onClick={() => setPwOpen(true)} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 font-bold" aria-label="Change password">
            <KeyRound size={16} /> <span className="max-sm:hidden">Password</span>
          </button>
          <button onClick={() => logout.mutate()} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 font-bold">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      {!isAdmin && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your progress">
          <Stat label="Explored" value={`${stats.data?.explored ?? 0} / 118`} bar={(stats.data?.explored ?? 0) / 118} />
          <Stat label="Mastered" value={`${stats.data?.mastered ?? 0} / 118`} bar={(stats.data?.mastered ?? 0) / 118} />
          <Stat label="Due today" value={String(due)} />
          <Stat label="Streak" value={`${stats.data?.streak_days ?? 0} day${stats.data?.streak_days === 1 ? "" : "s"}`} />
        </section>
      )}

      <nav className="flex max-w-full flex-wrap gap-1.5 self-start rounded-3xl border border-line bg-surface p-1.5" aria-label="Sections">
        {isAdmin ? (
          <>
            <Tab to="/" end icon={<LayoutDashboard size={18} />}>Dashboard</Tab>
            <Tab to="/manage" icon={<Settings size={18} />}>Manage</Tab>
            <Tab to="/explore" icon={<Compass size={18} />}>Explore</Tab>
            <Tab to="/practice" icon={<Dumbbell size={18} />}>Practice</Tab>
          </>
        ) : (
          <>
            <Tab to="/" end icon={<Compass size={18} />}>Explore</Tab>
            <Tab to="/practice" icon={<Dumbbell size={18} />}>
              Practice
              {due > 0 && <span className="ml-1 rounded-full bg-accent px-2 text-xs leading-5 text-white">{due}</span>}
            </Tab>
          </>
        )}
      </nav>

      <Routes>
        {isAdmin ? (
          <>
            <Route index element={<DashboardPage />} />
            <Route path="students/:id" element={<StudentPage />} />
            <Route path="manage/*" element={<ManagePage />} />
            <Route path="explore" element={<ExplorePage user={user} />} />
          </>
        ) : (
          <Route index element={<ExplorePage user={user} />} />
        )}
        <Route path="practice" element={<PracticePage />} />
        <Route path="practice/review" element={<ReviewSession />} />
        <Route path="practice/quiz/:mode" element={<QuizSession />} />
        <Route path="*" element={isAdmin ? <DashboardPage /> : <ExplorePage user={user} />} />
      </Routes>

      <PasswordDialog user={user} open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function Tab({ to, end, icon, children }: { to: string; end?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `flex items-center gap-2 rounded-full px-5 py-2.5 font-bold transition ${isActive ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>
      {icon}{children}
    </NavLink>
  );
}

function Stat({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
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
