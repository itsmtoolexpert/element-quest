/** Bohr-style shell model: nucleus with the proton count, electrons on rings that slowly rotate. */
export default function AtomModel({ number, shells, color }: { number: number; shells: number[]; color: string }) {
  const c = 110, rMin = 26, rMax = 102;
  const step = shells.length > 1 ? (rMax - rMin) / (shells.length - 1) : 0;
  return (
    <svg viewBox="0 0 220 220" className="size-44 max-w-full shrink-0" role="img"
      aria-label={`Shell model: ${shells.join(", ")} electrons in ${shells.length} shell${shells.length > 1 ? "s" : ""}`}>
      {shells.map((count, i) => {
        const r = rMin + step * i;
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={1.2} />
            <g className="eq-orbit" style={{ animationDuration: `${6 + i * 3}s`, animationDirection: i % 2 ? "reverse" : "normal" }}>
              {Array.from({ length: count }, (_, j) => {
                const a = (j / count) * Math.PI * 2;
                return <circle key={j} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={count > 18 ? 2.3 : 3.2} fill="var(--accent)" />;
              })}
            </g>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={18} fill={color} />
      <text x={c} y={c + 5} textAnchor="middle" fontFamily="JetBrains Mono Variable, monospace" fontSize={13} fontWeight={700} fill="#181A36">
        {number}+
      </text>
    </svg>
  );
}
