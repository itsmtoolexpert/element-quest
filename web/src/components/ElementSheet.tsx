import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { api, type ElementSummary, type Material } from "../api";
import { materialsWith, quickCheck } from "../lib/chem";
import AtomModel from "./AtomModel";
import { MaterialChip } from "./MaterialCard";
import QuickCheck from "./QuickCheck";

/** The element "file": opens as a dialog (a bottom sheet on phones). */
export default function ElementSheet({
  number, elements, materials, onNavigate, onClose, onPickMaterial,
}: {
  number: number | null;
  elements: ElementSummary[];
  materials: Material[];
  onNavigate: (n: number) => void;
  onClose: () => void;
  onPickMaterial: (m: Material) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const q = useQuery({ queryKey: ["element", number], queryFn: () => api.element(number!), enabled: number != null, placeholderData: keepPreviousData });
  const e = q.data;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (number != null && !d.open) d.showModal();
    if (number == null && d.open) d.close();
    if (number != null) d.scrollTop = 0;
  }, [number]);

  const question = useMemo(() => (e ? quickCheck(e) : null), [e]);
  const inside = useMemo(() => (e ? materialsWith(e.symbol, e.name, materials).slice(0, 8) : []), [e, materials]);
  const prev = number && number > 1 ? elements[number - 2] : undefined;
  const next = number && number < 118 ? elements[number] : undefined;
  const color = e?.family.color ?? "#9AA0B5";

  function onKeyDown(ev: React.KeyboardEvent) {
    if ((ev.target as HTMLElement).tagName === "BUTTON" && ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    if (ev.key === "ArrowLeft" && prev) onNavigate(prev.number);
    if (ev.key === "ArrowRight" && next) onNavigate(next.number);
  }

  const valenceText = e
    ? e.valence_electrons != null ? `${e.valence_electrons} valence electron${e.valence_electrons > 1 ? "s" : ""} in the outer shell.`
      : e.block === "d" ? "Transition metals can use electrons from more than one shell, so their valence varies." : null
    : null;

  return (
    <dialog ref={ref} onClose={onClose} onKeyDown={onKeyDown} aria-labelledby="el-name"
      onClick={(ev) => ev.target === ref.current && onClose()}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] overflow-y-auto rounded-3xl bg-surface p-0 text-fg shadow-2xl backdrop:bg-[rgba(10,12,35,.55)] backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:max-h-[94dvh] max-sm:w-screen max-sm:max-w-none max-sm:rounded-b-none"
      style={{ ["--c" as string]: color }}>
      {!e ? (
        <p className="p-8 text-muted">{q.isError ? "Couldn't load that element." : "Loading…"}</p>
      ) : (
        <>
          <header className="tint relative flex items-center gap-4 border-0 p-5 pr-14">
            <div className="grid size-24 shrink-0 place-items-center rounded-2xl border-[3px] bg-surface font-display text-5xl font-extrabold" style={{ borderColor: color }}>
              {e.symbol}
            </div>
            <div className="min-w-0">
              <h2 id="el-name" className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{e.name}</h2>
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
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Fact label="Atomic number" value={`${e.number} protons`} />
              <Fact label="Atomic mass" value={`${e.mass_is_estimate ? "~" : ""}${e.mass} u`} />
              <Fact label="Group · Period" value={`${e.group ?? "f-block"} · ${e.period}`} />
              {e.latin_name ? <Fact label="Symbol comes from" value={e.latin_name} /> : <Fact label="Block" value={`${e.block}-block`} />}
            </dl>

            <div className="flex flex-wrap items-center gap-4">
              <AtomModel number={e.number} shells={e.shells} color={color} />
              <Section title="Inside the atom" className="min-w-0 flex-1 basis-56">
                <p>{e.number} protons in the nucleus, {e.number} electrons around it in {e.shells.length} shell{e.shells.length > 1 ? "s" : ""}: <b className="font-mono">{e.shells.join(", ")}</b>.</p>
                <p className="mt-1.5">Electron configuration: <b className="font-mono">{e.electron_config}</b></p>
                {valenceText && <p className="mt-1.5">{valenceText}</p>}
              </Section>
            </div>

            <Section title="Where you'll meet it"><p>{e.content?.everyday_use}.</p></Section>
            <Section title="Go deeper">
              <p>{e.content?.go_deeper ?? e.family.description}</p>
              {e.content?.go_deeper && <p className="mt-1.5 text-muted">Family: {e.family.description}</p>}
            </Section>
            {e.content?.try_it && (
              <Section title="Try it / spot it" className="rounded-2xl border border-dashed border-accent-2 bg-[color-mix(in_oklab,var(--accent-2)_14%,var(--surface))] p-3.5">
                <p>{e.content.try_it}</p>
              </Section>
            )}
            {inside.length > 0 && (
              <Section title={`Found inside`}>
                <div className="flex flex-wrap gap-2">
                  {inside.map((m) => <MaterialChip key={m.id} m={m} onPick={(x) => onPickMaterial(x)} />)}
                </div>
              </Section>
            )}
            {question && <Section title="Quick check"><QuickCheck key={e.number} q={question} /></Section>}

            <nav className="flex justify-between gap-2">
              <button disabled={!prev} onClick={() => prev && onNavigate(prev.number)}
                className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 font-bold disabled:invisible">
                <ArrowLeft size={16} /> {prev?.name}
              </button>
              <button disabled={!next} onClick={() => next && onNavigate(next.number)}
                className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 font-bold disabled:invisible">
                {next?.name} <ArrowRight size={16} />
              </button>
            </nav>
          </div>
        </>
      )}
    </dialog>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full border bg-surface px-2.5 py-0.5" style={{ borderColor: "var(--c)" }}>{children}</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-mono text-sm font-bold [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
        <span className="size-2.5 rotate-45 rounded-sm" style={{ background: "var(--c)" }} />{title}
      </h3>
      <div className="max-w-prose">{children}</div>
    </section>
  );
}
