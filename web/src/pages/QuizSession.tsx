import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router";

import { api, type QuizFinish, type QuizResult } from "../api";
import ChoiceQuestion from "../components/ChoiceQuestion";
import ProgressDots from "../components/ProgressDots";
import { useToast } from "../components/Toast";
import { burst, rain } from "../lib/celebrate";

/** A 10-question round. Answers are checked on the device; the result is saved at the end. */
export default function QuizSession() {
  const { mode = "mixed" } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [nonce, setNonce] = useState(0);
  const round = useQuery({ queryKey: ["quiz", mode, nonce], queryFn: () => api.quizStart(mode), staleTime: Infinity, gcTime: 0 });
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [finish, setFinish] = useState<QuizFinish | null>(null);
  const [streak, setStreak] = useState(0);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const qs = round.data?.questions ?? [];
  const q = qs[i];

  function pick(option: string, el: HTMLElement) {
    if (picked) return;
    const ok = option === q.answer;
    setPicked(option);
    setResults((r) => [...r, { element: q.element, fact: q.fact, correct: ok }]);
    if (ok) {
      burst(el, 80);
      const s = streak + 1;
      setStreak(s);
      if (s === 3) toast("3 in a row! You're on fire.");
      if (s === 5) { toast("5-answer streak! Chemistry champion."); rain(1); }
      if (s === 10) { toast("10 straight! Legendary."); rain(2); }
    } else setStreak(0);
    setTimeout(() => nextBtn.current?.focus(), 50);
  }

  async function next() {
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); return; }
    try {
      const all = results;
      const r = await api.quizFinish(mode, all);
      setFinish(r);
      if (r.score / r.total >= 0.7) rain(r.score === r.total ? 3 : 1.5);
      const b = r.new_badges.at(-1);
      if (b) setTimeout(() => toast(`Badge unlocked: ${b.label}!`), 600);
      qc.invalidateQueries({ queryKey: ["stats", "me"] });
    } catch {
      toast("Couldn't save the result, but here's your score.");
      setFinish({ score: results.filter((x) => x.correct).length, total: results.length, new_badges: [] });
    }
  }

  function again() {
    setI(0); setPicked(null); setResults([]); setFinish(null); setStreak(0); setNonce((n) => n + 1);
  }

  const score = results.filter((r) => r.correct).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link to="/practice" className="flex w-max items-center gap-2 font-bold text-muted hover:text-fg"><ArrowLeft size={16} /> Practice</Link>
      {round.isPending && <p className="text-muted">Mixing up your questions…</p>}
      {round.isError && <p className="text-bad">Couldn't start that quiz.</p>}

      {round.data && !finish && q && (
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <div className="mb-1 font-display text-lg font-bold">{round.data.title}</div>
          {round.data.note && i === 0 && <p className="mb-3 text-sm text-muted">{round.data.note}</p>}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <ProgressDots results={results.map((r) => r.correct)} current={i} total={qs.length} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Question {i + 1} of {qs.length}</span>
          </div>
          <ChoiceQuestion key={i} kind={q.kind} prompt={q.prompt} options={q.options}
            picked={picked} answer={picked ? q.answer : null} onPick={pick} />
          {picked && (
            <div className="mt-4 flex flex-col gap-3">
              <p><b>{picked === q.answer ? "Nailed it! " : "Not quite. "}</b>{q.explanation}</p>
              <button ref={nextBtn} onClick={next} className="flex items-center gap-2 self-end rounded-full bg-accent px-5 py-3 font-bold text-white">
                {i + 1 < qs.length ? "Next question" : "See results"} <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {finish && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-8 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">Round complete</div>
          <div className="font-display text-7xl font-extrabold">{finish.score}/{finish.total}</div>
          <p className="text-lg">{message(score, finish.total)}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button onClick={again} className="rounded-full bg-accent px-5 py-3 font-bold text-white">Play again</button>
            <Link to="/practice" className="rounded-full bg-surface-2 px-5 py-3 font-bold">Pick another quiz</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function message(s: number, total: number): string {
  const p = s / total;
  if (p === 1) return "Perfect score! Periodic legend.";
  if (p >= 0.7) return "Great work! You really know your elements.";
  if (p >= 0.4) return "Solid start. Review a few more cards and try again.";
  return "Every chemist starts somewhere. Explore some element files and come back!";
}
