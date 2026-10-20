/** "just now", "12 min ago", "today at 7:12 PM", "yesterday", "3 days ago", "Oct 2". */
export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const t = new Date(iso);
  const mins = (Date.now() - t.getTime()) / 60_000;
  if (mins < 2) return "Just now";
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (t >= today) return `Today at ${t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  const days = Math.ceil((today.getTime() - t.getTime()) / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function quizModeLabel(mode: string): string {
  const [kind, arg] = mode.split(":");
  if (kind === "mixed") return "Mixed challenge";
  if (kind === "weak") return "Weak spots";
  if (kind === "explored") return "Explored elements";
  if (kind === "family") return `Family: ${arg}`;
  if (kind === "group") return `Group ${arg}`;
  if (kind === "period") return `Period ${arg}`;
  return mode;
}
