export default function ProgressDots({ results, current, total }: { results: boolean[]; current: number; total: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`Question ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`block h-2 w-6 rounded ${i < results.length ? (results[i] ? "bg-good" : "bg-bad") : i === current ? "bg-accent" : "bg-surface-2"}`} />
      ))}
    </div>
  );
}
