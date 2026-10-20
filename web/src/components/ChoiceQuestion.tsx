import { useEffect } from "react";

/**
 * A multiple-choice question. Before answering, options are buttons (keys 1–4 also work).
 * After answering, the right one turns green and a wrong pick shakes red.
 */
export default function ChoiceQuestion({
  kind, prompt, options, picked, answer, disabled, onPick,
}: {
  kind: string; prompt: string; options: string[];
  picked: string | null; answer: string | null; disabled?: boolean;
  onPick: (option: string, el: HTMLElement) => void;
}) {
  const done = picked != null;

  useEffect(() => {
    if (done || disabled) return;
    function onKey(e: KeyboardEvent) {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < options.length && !(e.target instanceof HTMLInputElement)) {
        const el = document.querySelector<HTMLElement>(`[data-opt="${i}"]`);
        if (el) onPick(options[i], el);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, disabled, options, onPick]);

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-accent">{kind}</div>
      <h2 className="mb-4 mt-1 text-balance font-display text-2xl font-bold leading-snug sm:text-[1.7rem]">{prompt}</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((o, i) => {
          const isAnswer = answer != null && o === answer;
          const state = !done ? ""
            : isAnswer ? "border-good bg-[color-mix(in_oklab,var(--good)_18%,var(--surface))]"
            : o === picked ? "eq-shake border-bad bg-[color-mix(in_oklab,var(--bad)_14%,var(--surface))]"
            : "opacity-55";
          return (
            <button key={o} data-opt={i} disabled={done || disabled}
              onClick={(e) => onPick(o, e.currentTarget)}
              className={`flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-left text-lg font-bold transition enabled:hover:-translate-y-0.5 enabled:hover:border-accent ${state}`}>
              <span className="hidden size-6 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-xs text-muted sm:grid">{i + 1}</span>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
