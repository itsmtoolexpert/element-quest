import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { api } from "../api";

/** Basic element file. Milestone 2 brings back the atom model, quick check and everything else. */
export default function ElementSheet({ symbol, onClose }: { symbol: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const q = useQuery({ queryKey: ["element", symbol], queryFn: () => api.element(symbol!), enabled: !!symbol });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (symbol && !d.open) d.showModal();
    if (!symbol && d.open) d.close();
  }, [symbol]);

  const e = q.data;
  const color = e?.family.color ?? "#9AA0B5";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(ev) => ev.target === ref.current && onClose()}
      className="m-auto w-[min(680px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] rounded-3xl bg-surface p-0 text-fg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{ ["--c" as string]: color }}
    >
      {!e ? (
        <p className="p-8 text-muted">{q.isError ? "Couldn't load that element." : "Loading…"}</p>
      ) : (
        <>
          <header className="tint relative flex items-center gap-4 border-0 p-5">
            <div className="grid size-24 shrink-0 place-items-center rounded-2xl border-[3px] bg-surface font-display text-5xl font-extrabold" style={{ borderColor: color }}>
              {e.symbol}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-extrabold leading-tight">{e.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
                <Tag>#{e.number}</Tag><Tag>{e.family.name}</Tag><Tag>{e.state} at room temp</Tag>
                {e.radioactive && <Tag>Radioactive</Tag>}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-surface">
              <X size={20} />
            </button>
          </header>
          <div className="flex flex-col gap-5 p-5">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label="Atomic mass" value={`${e.mass_is_estimate ? "~" : ""}${e.mass} u`} />
              <Fact label="Group · Period" value={`${e.group ?? "f-block"} · ${e.period}`} />
              <Fact label="Valence electrons" value={e.valence_electrons != null ? String(e.valence_electrons) : e.block === "d" ? "Varies" : "—"} />
              <Fact label="Electron configuration" value={e.electron_config} wide />
              <Fact label="Electrons per shell" value={e.shells.join(", ")} />
              {e.latin_name && <Fact label="Symbol comes from" value={e.latin_name} />}
            </dl>
            <Section title="Where you'll meet it">{e.content?.everyday_use}.</Section>
            <Section title="Go deeper">{e.content?.go_deeper ?? e.family.description}</Section>
            {e.content?.try_it && <Section title="Try it / spot it">{e.content.try_it}</Section>}
          </div>
        </>
      )}
    </dialog>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-surface px-2.5 py-0.5" style={{ borderColor: "var(--c)" }}>{children}</span>;
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-surface-2 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[11px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-mono text-sm font-bold [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-display text-lg font-bold">{title}</h3>
      <p className="max-w-prose">{children}</p>
    </section>
  );
}
