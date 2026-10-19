"use client";

import { IconTile, bundleIcon, spaceIcon } from "@/lib/icons";
import { ChevronRight, GripVertical, Minus, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { BUNDLES, FEATURES } from "@/data/features";
import { useAuth } from "@/stores/auth";
import { useDashboard } from "@/stores/dashboard";
import { useFeatures } from "@/stores/features";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Feature } from "@/data/features";
import { frequent, loadUsage, unused, type Usage } from "@/lib/usage";

export default function JelajahPage() {
  const enabled = useFeatures((s) => s.enabled);
  const toggle = useFeatures((s) => s.toggle);
  const enableMany = useFeatures((s) => s.enableMany);
  const disableMany = useFeatures((s) => s.disableMany);
  const userId = useAuth((s) => s.userId);
  const revealFor = useDashboard((s) => s.revealFor);
  const move = useFeatures((s) => s.move);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [editing, setEditing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [now, setNow] = useState(0);
  const [tidyDismissed, setTidyDismissed] = useState(false);
  useEffect(() => {
    // Read after mount: the page is prerendered without localStorage.
    setNow(Date.now());
    setUsage(loadUsage());
    try {
      setTidyDismissed(Number(localStorage.getItem(TIDY_KEY) ?? 0) > Date.now());
    } catch {
      /* private mode */
    }
  }, []);

  const mine = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f));
  // Focus: with many spaces, the ones actually opened lately go on top.
  const top = usage && mine.length > 8 ? frequent(usage, mine.map((f) => f.href), now) : [];
  const favourites = top.length >= 3 ? top.map((h) => mine.find((f) => f.href === h)!) : [];
  const stale = usage && !tidyDismissed ? unused(usage, mine.map((f) => f.href), now) : [];
  const others = FEATURES.filter((f) => !enabled.includes(f.href)).sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));

  return (
    <div>
      <AppHeader
        title="Jelajah"
        actions={
          mine.length > 0 ? (
            <button
              onClick={() => setEditing((v) => !v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                editing ? "bg-accent text-accent-fg" : "text-text-2"
              }`}
            >
              {editing ? "Selesai" : "Susun"}
            </button>
          ) : null
        }
      />

      <div className="px-5 pt-4 pb-8">
        {!editing && (
          <label className="mb-5 flex items-center gap-2 rounded-full bg-bg-elev1 px-3.5 py-2.5">
            <Search size={16} className="shrink-0 text-text-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ruang…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-text-1 outline-none placeholder:text-text-4"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Hapus pencarian" className="text-text-4">
                <X size={16} />
              </button>
            )}
          </label>
        )}

        {query.trim() ? (
          <SearchResults
            query={query.trim()}
            mine={mine}
            others={others}
            onAdd={(f) => {
              hapticTap();
              toggle(f.href);
              if (userId) void revealFor(userId, [f.href]);
            }}
          />
        ) : mine.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-3">
            Belum ada ruang. Tambahkan yang kalian butuhkan di bawah.
          </div>
        ) : !editing ? (
          <>
            {stale.length >= 3 && (
              <TidyCard
                spaces={stale.map((h) => mine.find((f) => f.href === h)!)}
                onHide={() => {
                  hapticSuccess();
                  disableMany(stale);
                }}
                onLater={() => {
                  setTidyDismissed(true);
                  try {
                    localStorage.setItem(TIDY_KEY, String(Date.now() + 30 * 86_400_000));
                  } catch {
                    /* private mode */
                  }
                }}
              />
            )}
            {favourites.length > 0 ? (
              // The rest in one block: small groups of two cost a heading each.
              <div className="space-y-5">
                <IconSection title="Sering dipakai" items={favourites} />
                <IconSection title="Ruang lain" items={mine.filter((f) => !favourites.includes(f))} start={favourites.length} />
              </div>
            ) : (
              <SpaceGrid mine={mine} />
            )}
          </>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => hapticTap()}
            onDragEnd={(e: DragEndEvent) => {
              if (e.over && e.active.id !== e.over.id) {
                move(String(e.active.id), String(e.over.id));
                hapticSuccess();
              }
            }}
          >
            <SortableContext items={mine.map((f) => f.href)} strategy={verticalListSortingStrategy}>
              <ul className="surface divide-y divide-[color:var(--hairline)] overflow-hidden">
                {mine.map((f) => (
                  <SpaceCard
                    key={f.href}
                    feature={f}
                    editing={editing}
                    onHide={() => {
                      hapticTap();
                      toggle(f.href);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {!query.trim() && others.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center justify-between py-2 text-left active:opacity-60"
            >
              <span>
                <span className="block text-[14px] font-semibold text-text-1">
                  Tambah ruang
                </span>
                <span className="block text-[12px] text-text-3">
                  {others.length} ruang lain siap dipakai kapan saja
                  {others.some((f) => f.isNew) && (
                    <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-accent-fg">
                      {others.filter((f) => f.isNew).length} baru
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`text-text-3 transition-transform duration-300 ease-ios ${
                  showMore ? "rotate-90" : ""
                }`}
              >
                ›
              </span>
            </button>
            {showMore && (
              <>
              {BUNDLES.some((b) => b.hrefs.some((h) => !enabled.includes(h))) && (
          <section className="mt-2">
            <div className="mb-2 px-1 text-[13px] font-semibold text-text-3">Paket ruang</div>
            <ul className="surface divide-y divide-[color:var(--hairline)] overflow-hidden">
              {BUNDLES.map((b) => {
                const items = b.hrefs.map((h) => FEATURES.find((f) => f.href === h)).filter(Boolean) as Feature[];
                const missing = items.filter((f) => !enabled.includes(f.href));
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <IconTile spec={bundleIcon(b.id)} size={36} radius={10} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-text-1">{b.title}</span>
                      <span className="block truncate text-[12px] text-text-3">
                        {items.map((f) => f.title).join(", ")}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        hapticTap();
                        enableMany(missing.map((f) => f.href));
                        if (userId) void revealFor(userId, missing.map((f) => f.href));
                      }}
                      disabled={!missing.length}
                      className="shrink-0 rounded-full bg-bg-elev1 px-3 py-1.5 text-[12px] font-semibold text-text-1 active:scale-95 disabled:bg-transparent disabled:text-text-4"
                    >
                      {missing.length ? `Tambah ${missing.length}` : "Dipakai"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
              <div className="mb-2 mt-5 px-1 text-[13px] font-semibold text-text-3">Satu per satu</div>
              <ul className="surface slide-up divide-y divide-[color:var(--hairline)] overflow-hidden">
                {others.map((f) => (
                  <li key={f.href} className="flex items-center gap-3 px-4 py-3">
                    <IconTile spec={spaceIcon(f.href)} size={36} radius={10} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[14px] text-text-1">
                        {f.title}
                        {f.isNew && (
                          <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-accent-fg">
                            Baru
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[12px] text-text-4">
                        {f.subtitle}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        hapticTap();
                        toggle(f.href);
                        if (userId) void revealFor(userId, [f.href]);
                      }}
                      className="shrink-0 rounded-full bg-bg-elev1 px-3 py-1.5 text-[12px] font-semibold text-text-1 active:scale-95"
                    >
                      Tambah
                    </button>
                  </li>
                ))}
              </ul>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const TIDY_KEY = "twogether:tidy-later";

/** "These haven't been opened in a month — hide them?" (they stay one tap away). */
function TidyCard({ spaces, onHide, onLater }: { spaces: Feature[]; onHide: () => void; onLater: () => void }) {
  const names = spaces.map((f) => SHORT[f.href] ?? f.title);
  return (
    <div className="surface mb-5 p-4">
      <div className="text-[14px] font-semibold text-text-1">Biar Jelajah lebih fokus</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-text-3">
        {spaces.length} ruang tidak dibuka sebulan terakhir: {names.slice(0, 4).join(", ")}
        {names.length > 4 ? `, dan ${names.length - 4} lainnya` : ""}. Sembunyikan dulu? Datanya tetap aman dan
        bisa ditambah lagi kapan saja.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={onHide} className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-fg active:scale-95">
          Sembunyikan {spaces.length}
        </button>
        <button onClick={onLater} className="rounded-full bg-bg-elev1 px-3.5 py-1.5 text-[12px] font-semibold text-text-2 active:scale-95">
          Nanti saja
        </button>
      </div>
    </div>
  );
}

/**
 * Their spaces as app icons, four per row, grouped like the onboarding
 * bundles. A space in several bundles shows up once, in the first.
 */
function SpaceGrid({ mine }: { mine: Feature[] }) {
  const placed = new Set<string>();
  const groups: { title: string; items: Feature[] }[] = [];
  for (const b of BUNDLES) {
    const items = mine.filter((f) => b.hrefs.includes(f.href) && !placed.has(f.href));
    items.forEach((f) => placed.add(f.href));
    if (items.length) groups.push({ title: b.title, items });
  }
  const rest = mine.filter((f) => !placed.has(f.href));
  if (rest.length) groups.unshift({ title: groups.length ? "Utama" : "Ruang kalian", items: rest });
  // A heading for a single icon costs a whole row; gather those at the end.
  const lone = groups.filter((g) => g.items.length === 1);
  if (lone.length > 1 || (lone.length === 1 && groups.length > 1)) {
    const kept = groups.filter((g) => g.items.length > 1);
    groups.length = 0;
    groups.push(...kept, { title: "Lainnya", items: lone.flatMap((g) => g.items) });
  }

  let n = 0;
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const start = n;
        n += g.items.length;
        return <IconSection key={g.title} title={g.title} items={g.items} start={start} />;
      })}
    </div>
  );
}

function IconSection({ title, items, start = 0 }: { title: string; items: Feature[]; start?: number }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-3 px-1 text-[13px] font-semibold text-text-3">{title}</div>
      <div className="grid grid-cols-4 gap-x-1 gap-y-3.5 min-[360px]:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {items.map((f, i) => (
          <SpaceIcon key={f.href} feature={f} index={start + i} />
        ))}
      </div>
    </section>
  );
}

// Under a 5-across icon only ~10 characters fit; like iPhone app names, the
// grid uses a short form (the full name stays everywhere else).
const SHORT: Record<string, string> = {
  "/belanja": "Belanja",
  "/nikah": "Nikah",
  "/target": "Target",
  "/fokus": "Fokus",
  "/aset": "Aset",
  "/laporan": "Laporan",
  "/impor": "Impor",
  "/hijriah": "Hijriah",
  "/jadwal": "Kuliah",
  "/uang": "Hutang",
};

function SpaceIcon({ feature: f, index }: { feature: Feature; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, delay: Math.min(index, 20) * 0.02 }}
    >
      <Link href={f.href} aria-label={f.title} className="flex flex-col items-center gap-1.5 active:opacity-80">
        <motion.span whileTap={{ scale: 0.88 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
          <IconTile spec={spaceIcon(f.href)} size={52} radius={16} />
        </motion.span>
        <span className="w-full truncate px-0.5 text-center text-[11px] font-medium leading-tight text-text-2">
          {SHORT[f.href] ?? f.title}
        </span>
      </Link>
    </motion.div>
  );
}

function SearchResults({
  query,
  mine,
  others,
  onAdd,
}: {
  query: string;
  mine: Feature[];
  others: Feature[];
  onAdd: (f: Feature) => void;
}) {
  const q = query.toLowerCase();
  const hit = (f: Feature) =>
    f.title.toLowerCase().includes(q) || f.subtitle.toLowerCase().includes(q);
  const mineHits = mine.filter(hit);
  const otherHits = others.filter(hit);

  if (!mineHits.length && !otherHits.length) {
    return (
      <div className="py-10 text-center text-[13px] text-text-3">
        Tidak ada ruang untuk &ldquo;{query}&rdquo;
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {mineHits.length > 0 && (
        <div className="grid grid-cols-4 gap-x-1 gap-y-3.5 min-[360px]:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {mineHits.map((f, i) => (
            <SpaceIcon key={f.href} feature={f} index={i} />
          ))}
        </div>
      )}
      {otherHits.length > 0 && (
        <section>
          <div className="mb-2 px-1 text-[13px] font-semibold text-text-3">Belum dipakai</div>
          <ul className="surface divide-y divide-[color:var(--hairline)] overflow-hidden">
            {otherHits.map((f) => (
              <li key={f.href} className="flex items-center gap-3 px-4 py-3">
                <IconTile spec={spaceIcon(f.href)} size={36} radius={10} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-text-1">{f.title}</span>
                  <span className="block truncate text-[12px] text-text-4">{f.subtitle}</span>
                </span>
                <button
                  onClick={() => onAdd(f)}
                  className="shrink-0 rounded-full bg-bg-elev1 px-3 py-1.5 text-[12px] font-semibold text-text-1 active:scale-95"
                >
                  Tambah
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SpaceCard({
  feature: f,
  editing,
  onHide,
}: {
  feature: Feature;
  editing: boolean;
  onHide: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: f.href, disabled: !editing });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: editing ? "manipulation" : undefined,
      }}
      className={`pressable flex items-center gap-3 bg-bg-card px-4 py-3 ${editing ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "is-dragging relative z-10" : ""
      }`}
      {...(editing ? attributes : {})}
      {...(editing ? listeners : {})}
    >
      {editing && (
        <button
          aria-label={`Sembunyikan ${f.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onHide}
          className="pop-in grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--negative)] text-white"
        >
          <Minus size={14} strokeWidth={3} />
        </button>
      )}
      <Link
        href={f.href}
        onClick={(e) => editing && e.preventDefault()}
        className={`flex min-w-0 flex-1 items-center gap-3 ${editing ? "pointer-events-none select-none" : ""}`}
      >
        <IconTile spec={spaceIcon(f.href)} size={36} radius={10} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-text-1">{f.title}</span>
          <span className="block truncate text-[12px] text-text-3">{f.subtitle}</span>
        </span>
        {editing ? (
          <GripVertical size={18} className="shrink-0 text-text-4" />
        ) : (
          <ChevronRight size={18} className="shrink-0 text-text-5" />
        )}
      </Link>
    </li>
  );
}
