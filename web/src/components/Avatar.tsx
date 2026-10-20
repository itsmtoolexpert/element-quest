import { Atom, Bolt, Flame, FlaskConical, GraduationCap, Magnet, Rocket, type LucideIcon } from "lucide-react";

const ICONS: Record<string, [LucideIcon, string]> = {
  atom: [Atom, "#7B61FF"],
  flask: [FlaskConical, "#FF595E"],
  rocket: [Rocket, "#1982C4"],
  magnet: [Magnet, "#8AC926"],
  flame: [Flame, "#FF924C"],
  bolt: [Bolt, "#FFCA3A"],
  teacher: [GraduationCap, "#2EC4B6"],
};

export default function Avatar({ avatar, size = 56 }: { avatar: string | null; size?: number }) {
  const [Icon, color] = ICONS[avatar ?? ""] ?? ICONS.atom;
  return (
    <span
      className="tint inline-grid shrink-0 place-items-center rounded-2xl border-2"
      style={{ ["--c" as string]: color, width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={size * 0.5} strokeWidth={2.2} color={color} />
    </span>
  );
}
