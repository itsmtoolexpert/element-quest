import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { ArrowLeft, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";

import { api, type Profile } from "../api";
import Avatar from "../components/Avatar";

export default function LoginPage() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: api.profiles });
  const [picked, setPicked] = useState<Profile | null>(null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
          Element <span className="rainbow-text">Quest</span>
        </h1>
        <p className="mt-3 text-lg text-muted">{picked ? `Hi ${picked.display_name}! Type your password.` : "Who's learning today?"}</p>
      </header>

      {picked ? (
        <PasswordForm profile={picked} onBack={() => setPicked(null)} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profiles.data?.map((p) => (
            <li key={p.username}>
              <button
                onClick={() => setPicked(p)}
                className="flex w-full flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Avatar avatar={p.avatar} size={72} />
                <span className="font-display text-lg font-bold">{p.display_name}</span>
                {p.role === "admin" && <span className="text-xs uppercase tracking-widest text-muted">Admin</span>}
              </button>
            </li>
          ))}
          {profiles.isPending && <li className="col-span-full text-center text-muted">Loading profiles…</li>}
          {profiles.isError && <li className="col-span-full text-center text-bad">Couldn't load profiles.</li>}
        </ul>
      )}
    </main>
  );
}

function PasswordForm({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api.login(profile.username, password),
    onSuccess: (user) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, disableForReducedMotion: true });
      qc.setQueryData(["me"], user);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (password) login.mutate();
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-6">
      <Avatar avatar={profile.avatar} size={80} />
      <label className="w-full">
        <span className="sr-only">Password</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-full border border-line bg-bg px-5 py-3 text-lg"
        />
      </label>
      {login.isError && <p role="alert" className="text-center text-bad">{login.error.message}</p>}
      <div className="flex w-full gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-3 font-bold">
          <ArrowLeft size={18} /> Back
        </button>
        <button
          type="submit"
          disabled={login.isPending || !password}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
        >
          <LogIn size={18} /> {login.isPending ? "Signing in…" : "Let's go"}
        </button>
      </div>
    </form>
  );
}
