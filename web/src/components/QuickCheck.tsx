import { useState } from "react";

import { burst } from "../lib/celebrate";
import type { Question } from "../lib/chem";

export default function QuickCheck({ q, onAnswer }: { q: Question; onAnswer?: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const done = picked != null;
  const right = picked === q.correct;

  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="mb-3 font-bold">{q.question}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((o) => {
          const isCorrect = o === q.correct;
          const state = !done ? "" : isCorrect ? "border-good bg-[color-mix(in_oklab,var(--good)_18%,var(--surface))]"
            : o === picked ? "eq-shake border-bad bg-[color-mix(in_oklab,var(--bad)_14%,var(--surface))]" : "opacity-60";
          return (
            <button key={o} disabled={done}
              onClick={(e) => {
                setPicked(o);
                if (o === q.correct) burst(e.currentTarget, 80);
                onAnswer?.(o === q.correct);
              }}
              className={`rounded-xl border-2 border-line bg-surface px-3 py-2.5 text-left font-bold transition enabled:hover:-translate-y-0.5 enabled:hover:border-accent ${state}`}>
              {o}
            </button>
          );
        })}
      </div>
      {done && (
        <p className="mt-3">
          <b>{right ? "Nailed it! " : "Not quite. "}</b>{q.explanation}
        </p>
      )}
    </div>
  );
}
