import { useState } from "react";

import type { DayActivity } from "../api";

const total = (d: DayActivity) => d.explored + d.reviews + d.quizzes;
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts);

/**
 * One bar per day: how much the student did (elements explored + cards reviewed + quizzes).
 * Single series, so no legend; hover or focus a bar for the breakdown.
 */
export default function ActivityBars({ days, height = 64 }: { days: DayActivity[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map(total));
  const active = days.filter((d) => total(d) > 0).length;
  const h = hover != null ? days[hover] : null;

  return (
    <figure className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }} role="img"
        aria-label={`Active on ${active} of the last ${days.length} days`}>
        {days.map((d, i) => {
          const t = total(d);
          const pct = t ? Math.max(8, (t / max) * 100) : 0;
          return (
            <button key={d.date} type="button" tabIndex={0}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`${dayLabel(d.date, { weekday: "short", month: "short", day: "numeric" })}: ${t ? `${d.reviews} cards, ${d.quizzes} quizzes, ${d.explored} explored` : "no activity"}`}
              className="flex h-full min-w-0 flex-1 items-end">
              <span className={`block w-full rounded-t-[4px] ${t ? "bg-accent-2" : "bg-surface-2"} ${hover === i ? "opacity-80" : ""}`}
                style={{ height: t ? `${pct}%` : 3 }} />
            </button>
          );
        })}
      </div>
      <figcaption className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>{dayLabel(days[0].date, { month: "short", day: "numeric" })}</span>
        <span>Today</span>
      </figcaption>
      {h && (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `clamp(0px, calc(${((hover! + 0.5) / days.length) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}>
          <b className="block">{dayLabel(h.date, { weekday: "short", month: "short", day: "numeric" })}</b>
          {total(h) ? (
            <span className="text-muted">{h.reviews} cards · {h.quizzes} quiz{h.quizzes === 1 ? "" : "zes"} · {h.explored} explored</span>
          ) : <span className="text-muted">No activity</span>}
        </div>
      )}
    </figure>
  );
}
