import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { api, type CardQuestion, type ReviewAnswer } from "../api";
import ChoiceQuestion from "../components/ChoiceQuestion";
import ProgressDots from "../components/ProgressDots";
import { useToast } from "../components/Toast";
import { burst, rain } from "../lib/celebrate";

type Phase = "loading" | "card" | "done" | "error";

/** Today's flashcards. Loads up to 20, then checks for more (cards you missed come back after a few minutes). */
export default function ReviewSession() {
  const qc = useQueryClient();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [cards, setCards] = useState<CardQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewAnswer | null>(null);
  const [score, setScore] = useState<boolean[]>([]);
  const [mastered, setMastered] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const shownAt = useRef(performance.now());
  const nextBtn = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const q = await api.reviewQueue();
      setCards(q.cards);
      setI(0);
      setPhase(q.cards.length ? "card" : "done");
      shownAt.current = performance.now();
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { qc.invalidateQueries({ queryKey: ["stats", "me"] }); qc.invalidateQueries({ queryKey: ["mastery"] }); }, [qc]);

  const card = cards[i];

  async function answer(option: string, el: HTMLElement) {
    if (saving || picked) return;
    setPicked(option);
    setSaving(true);
    try {
      const r = await api.reviewAnswer(card.card_id, option, Math.round(performance.now() - shownAt.current));
      setResult(r);
      setScore((s) => [...s, r.correct]);
      if (r.correct) burst(el, 70);
      if (r.element_level === "mastered" && !mastered.includes(String(card.element))) {
        setMastered((m) => [...m, String(card.element)]);
      }
      const b = r.new_badges.at(-1);
      if (b) { toast(`Badge unlocked: ${b.label}!`); rain(1.5); }
      setTimeout(() => nextBtn.current?.focus(), 50);
    } catch {
      toast("Couldn't save that answer. Check the connection and try again.");
      setPicked(null);
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setPicked(null);
    setResult(null);
    if (i + 1 < cards.length) {
      setI(i + 1);
      shownAt.current = performance.now();
    } else {
      load();
    }
  }

  const right = score.filter(Boolean).length;
  useEffect(() => {
    if (phase === "done" && score.length >= 5 && right / score.length >= 0.8) rain(2);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link to="/practice" className="flex w-max items-center gap-2 font-bold text-muted hover:text-fg"><ArrowLeft size={16} /> Practice</Link>

      {phase === "loading" && <p className="text-muted">Shuffling your cards…</p>}
      {phase === "error" && <p className="text-bad">Couldn't load your cards. Is the laptop awake?</p>}

      {phase === "card" && card && (
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <ProgressDots results={score.slice(score.length - i - (result ? 1 : 0))} current={i} total={cards.length} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              Card {i + 1} of {cards.length}{card.state === "new" ? " · new" : ""}
            </span>
          </div>
          <ChoiceQuestion kind={card.kind} prompt={card.prompt} options={card.options}
            picked={picked} answer={result?.answer ?? null} disabled={saving} onPick={answer} />
          {result && (
            <div className="mt-4 flex flex-col gap-3">
              <p><b>{result.correct ? "Nailed it! " : "Not quite. "}</b>{result.explanation}</p>
              <p className="text-sm text-muted">{nextLabel(result)}</p>
              <button ref={nextBtn} onClick={next}
                className="flex items-center gap-2 self-end rounded-full bg-accent px-5 py-3 font-bold text-white">
                {i + 1 < cards.length ? "Next card" : "Finish"} <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-8 text-center">
          <PartyPopper size={44} className="text-accent" />
          {score.length ? (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-muted">All caught up</div>
              <div className="font-display text-6xl font-extrabold">{right}/{score.length}</div>
              <p className="text-lg">{score.length && right / score.length >= 0.8 ? "Brilliant session!" : "Good work. The ones you missed will come back soon."}</p>
              {mastered.length > 0 && <p className="font-bold">You mastered {mastered.length} element{mastered.length > 1 ? "s" : ""} today!</p>}
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">Nothing due right now</h2>
              <p className="max-w-md text-muted">Open new elements in Explore to add cards to your deck, or take a quiz.</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link to="/practice" className="rounded-full bg-accent px-5 py-3 font-bold text-white">Back to practice</Link>
            <Link to="/" className="rounded-full bg-surface-2 px-5 py-3 font-bold">Explore</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function nextLabel(r: ReviewAnswer): string {
  const mins = (new Date(r.next_due).getTime() - Date.now()) / 60_000;
  if (mins < 60) return `You'll see this card again in about ${Math.max(1, Math.round(mins))} minute${Math.round(mins) === 1 ? "" : "s"}.`;
  const hours = mins / 60;
  if (hours < 36) return `You'll see this card again in about ${Math.round(hours)} hours.`;
  const days = Math.round(hours / 24);
  return `You'll see this card again in ${days} day${days === 1 ? "" : "s"}.`;
}
