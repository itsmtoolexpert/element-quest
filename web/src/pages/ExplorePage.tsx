import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, type Explored, type Material, type User } from "../api";
import ElementSheet from "../components/ElementSheet";
import MaterialCard, { MaterialChip } from "../components/MaterialCard";
import PeriodicTable, { type TableState } from "../components/PeriodicTable";
import SearchBox from "../components/SearchBox";
import { useToast } from "../components/Toast";
import { burst, rain } from "../lib/celebrate";
import { elementOfTheDay, elementScore, exactElement, materialScore, materialsWith, norm } from "../lib/chem";

export default function ExplorePage({ user }: { user: User }) {
  const qc = useQueryClient();
  const toast = useToast();
  const elements = useQuery({ queryKey: ["elements"], queryFn: api.elements });
  const families = useQuery({ queryKey: ["families"], queryFn: api.families });
  const collections = useQuery({ queryKey: ["collections"], queryFn: api.collections });
  const materials = useQuery({ queryKey: ["materials"], queryFn: api.materials });
  const explored = useQuery({ queryKey: ["explored"], queryFn: api.explored });

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Material | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [finder, setFinder] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const els = elements.data ?? [];
  const mats = materials.data ?? [];
  const famMap = useMemo(() => new Map((families.data ?? []).map((f) => [f.code, f])), [families.data]);
  const bySymbol = useMemo(() => new Map(els.map((e) => [e.symbol, e])), [els]);
  const seen = useMemo(() => new Set(explored.data?.numbers ?? []), [explored.data]);

  // ---------------------------------------------------------------- search result
  const q = norm(query);
  const exact = q ? exactElement(q, els) : undefined;
  const matHits = useMemo(() => (q.length >= 2
    ? mats.map((m) => [materialScore(m, q), m] as const).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0])
    : []), [q, mats]);
  const material: Material | null = picked
    ?? (matHits.length && (!exact || matHits[0][0] === 3) ? matHits[0][1] : null);
  const moreMats = material ? matHits.map(([, m]) => m).filter((m) => m.id !== material.id) : [];
  const anyElement = q ? els.some((e) => elementScore(e, q) > 0) : true;
  const notFound = q.length >= 3 && !material && !anyElement;
  const usedIn = !material && exact ? materialsWith(exact.symbol, exact.name, mats).slice(0, 8) : [];

  // Log searches that find nothing, once the student stops typing.
  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => { api.logMiss(query.trim()).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [notFound, query]);

  // ---------------------------------------------------------------- table state
  const tableState: TableState = useMemo(() => {
    const fset = finder ? new Set(collections.data?.find((c) => c.slug === finder)?.symbols ?? []) : null;
    const filtering = !!(family || fset || q);
    const visible = new Set<number>();
    for (const e of els) {
      const qok = material ? e.symbol in material.composition : !q || elementScore(e, q) > 0;
      if ((!family || e.family_code === family) && (!fset || fset.has(e.symbol)) && qok) visible.add(e.number);
    }
    return {
      visible: filtering ? visible : null,
      glowing: fset || q ? visible : new Set(),
      pct: new Map(material ? Object.entries(material.composition) : []),
      seen,
    };
  }, [els, family, finder, collections.data, q, material, seen]);

  // ---------------------------------------------------------------- exploring
  const explore = useMutation({
    mutationFn: ({ n }: { n: number; from: Element | null }) => api.explore(n),
    onSuccess: (r, { n, from }) => {
      if (!r.new) return;
      qc.setQueryData<Explored>(["explored"], (old) => ({
        numbers: [...(old?.numbers ?? []), n], badges: [...(old?.badges ?? []), ...r.new_badges],
      }));
      qc.invalidateQueries({ queryKey: ["stats", "me"] });
      qc.invalidateQueries({ queryKey: ["mastery"] });
      burst(from, 30);
      const b = r.new_badges.find((x) => x.code.startsWith("family:")) ?? r.new_badges.at(-1);
      if (b) {
        setTimeout(() => {
          toast(b.code === "explored:1" ? "First element explored! 117 to go." : `Badge unlocked: ${b.label}!`);
          if (b.code !== "explored:1") rain(b.code === "explored:118" ? 3 : 1.5);
        }, 350);
      }
    },
  });

  function openElement(n: number, from: Element | null = null) {
    setOpen(n);
    explore.mutate({ n, from });
  }

  function pickMaterial(m: Material, from?: Element | null) {
    setQuery(m.name);
    setPicked(m);
    if (from) burst(from, 40);
    setOpen(null);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function onEnter() {
    if (exact && !material) return openElement(exact.number, null);
    if (material) return resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const first = els.find((e) => elementScore(e, q) > 0);
    if (first) openElement(first.number, null);
  }

  function surprise(from: HTMLElement) {
    const pool = Math.random() < 0.6 ? els.filter((e) => e.featured) : els;
    const e = pool[Math.floor(Math.random() * pool.length)];
    burst(from, 50);
    setTimeout(() => openElement(e.number, null), 250);
  }

  if (!elements.data || !families.data) {
    return <p className="text-muted">{elements.isError ? "Couldn't load the elements." : "Loading the periodic table…"}</p>;
  }

  const spot = elementOfTheDay(els);
  const featuredMats = mats.filter((m) => m.featured);

  return (
    <div className="flex flex-col gap-4">
      {spot && (
        <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-line bg-surface p-4"
          style={{ ["--c" as string]: famMap.get(spot.family_code)?.color }}>
          <div className="tint grid size-16 shrink-0 place-items-center rounded-2xl border-2 font-display text-3xl font-extrabold">{spot.symbol}</div>
          <div className="min-w-0 flex-1 basis-60">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">Element of the day</div>
            <h2 className="font-display text-xl font-bold">{spot.name}</h2>
            <p className="text-muted">{spot.everyday_use}</p>
          </div>
          <button onClick={(ev) => openElement(spot.number, ev.currentTarget)}
            className="rounded-full bg-accent px-5 py-2.5 font-bold text-white transition hover:scale-[1.03]">Open file</button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBox value={query} onChange={(v) => { setQuery(v); setPicked(null); }}
          elements={els} materials={mats} families={famMap}
          onPickElement={(e, from) => { setQuery(""); setPicked(null); openElement(e.number, from); }}
          onPickMaterial={(m) => pickMaterial(m)} onEnter={onEnter} />
        <button onClick={(ev) => surprise(ev.currentTarget)}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-white transition hover:scale-[1.03]">
          <Shuffle size={18} /> Surprise me
        </button>
      </div>

      {!q && featuredMats.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">What's inside…</span>
          {featuredMats.map((m) => <MaterialChip key={m.id} m={m} onPick={pickMaterial} />)}
        </div>
      )}

      <div ref={resultRef} className="scroll-mt-4">
        {material && (
          <MaterialCard m={material} more={moreMats} bySymbol={bySymbol} families={famMap}
            onOpenElement={(e, from) => openElement(e.number, from)} onPickMaterial={pickMaterial} />
        )}
        {usedIn.length > 0 && exact && (
          <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">Found inside</div>
            <h2 className="font-display text-2xl font-extrabold">Where {exact.name} hides</h2>
            <div className="flex flex-wrap gap-2">{usedIn.map((m) => <MaterialChip key={m.id} m={m} onPick={pickMaterial} />)}</div>
            <p className="text-sm text-muted">Tap a thing to see everything it's made of, or press Enter to open the {exact.name} file.</p>
          </section>
        )}
        {notFound && (
          <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">What's inside</div>
            <h2 className="font-display text-2xl font-extrabold">“{query.trim()}” isn't in our lab book yet</h2>
            <p className="text-muted">We've noted it so it can be added. Meanwhile, try one of these:</p>
            <div className="flex flex-wrap gap-2">{featuredMats.map((m) => <MaterialChip key={m.id} m={m} onPick={pickMaterial} />)}</div>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <ChipRow label="Find elements in">
          {collections.data?.map((c) => (
            <Pill key={c.slug} pressed={finder === c.slug}
              onClick={(ev) => { const on = finder !== c.slug; setFinder(on ? c.slug : null); if (on) burst(ev.currentTarget, 40); }}>
              {c.label}
            </Pill>
          ))}
        </ChipRow>
        <p className="min-h-[1.4em] text-sm text-muted">
          {finder ? `${collections.data?.find((c) => c.slug === finder)?.note} Tap a glowing tile to see its job.`
            : "Pick a place above and the elements hiding there will light up."}
        </p>
        <ChipRow label="Families">
          {families.data.map((f) => (
            <Pill key={f.code} pressed={family === f.code} onClick={() => setFamily(family === f.code ? null : f.code)}>
              <span className="size-3 rounded-full" style={{ background: f.color }} />{f.short_name}
            </Pill>
          ))}
        </ChipRow>
      </div>

      <p className="text-sm text-muted md:hidden">Swipe sideways on the table to see all 18 groups.</p>
      <PeriodicTable elements={els} families={famMap} state={tableState} onPick={(e, from) => openElement(e.number, from)} />

      {user.role === "student" && (
        <section>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Family badges</div>
          <div className="flex flex-wrap gap-2">
            {families.data.map((f) => {
              const all = els.filter((e) => e.family_code === f.code);
              const n = all.filter((e) => seen.has(e.number)).length;
              const done = n === all.length;
              return (
                <span key={f.code} className={`rounded-xl border px-3 py-2 text-sm font-bold ${done ? "tint text-fg" : "border-transparent bg-surface-2 text-muted"}`}
                  style={{ ["--c" as string]: f.color }}>
                  {f.short_name} {n}/{all.length}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <ElementSheet number={open} elements={els} materials={mats}
        onNavigate={(n) => openElement(n, null)} onClose={() => setOpen(null)} onPickMaterial={(m) => pickMaterial(m)} />
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-muted">{label}</span>
      {children}
    </div>
  );
}

function Pill({ pressed, onClick, children }: { pressed: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }) {
  return (
    <button aria-pressed={pressed} onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition ${pressed ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-accent"}`}>
      {children}
    </button>
  );
}

