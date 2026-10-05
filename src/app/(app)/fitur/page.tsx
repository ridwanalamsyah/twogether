"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { FEATURES, tintBg } from "@/data/features";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Feature } from "@/data/features";

export default function JelajahPage() {
  const enabled = useFeatures((s) => s.enabled);
  const toggle = useFeatures((s) => s.toggle);
  const move = useFeatures((s) => s.move);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [editing, setEditing] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const mine = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f));
  const others = FEATURES.filter((f) => !enabled.includes(f.href));

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
        {mine.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-3">
            Belum ada ruang. Tambahkan yang kalian butuhkan di bawah.
          </div>
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
            <SortableContext items={mine.map((f) => f.href)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {mine.map((f, i) => (
                  <SpaceCard
                    key={f.href}
                    feature={f}
                    index={i}
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

        {others.length > 0 && (
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
              <ul className="slide-up mt-2 divide-y divide-border border-y border-border">
                {others.map((f) => (
                  <li key={f.href} className="flex items-center gap-3 py-2.5">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px] leading-none"
                      style={{ background: tintBg(f.tint, 16) }}
                    >
                      {f.emoji}
                    </span>
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
                      }}
                      className="rounded-full bg-bg-elev2 px-3 py-1 text-[12px] font-semibold text-text-1 active:scale-95"
                    >
                      + Tambah
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function SpaceCard({
  feature: f,
  index,
  editing,
  onHide,
}: {
  feature: Feature;
  index: number;
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
      className={`relative slide-up ${editing ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      {...(editing ? attributes : {})}
      {...(editing ? listeners : {})}
    >
      <Link
        href={f.href}
        onClick={(e) => editing && e.preventDefault()}
        style={{
          background: tintBg(f.tint, 14),
          animationDelay: editing ? `${(index % 3) * -0.11}s` : undefined,
        }}
        className={`pressable flex h-full flex-col gap-3 rounded-[22px] p-4 ${
          editing ? "edit-jiggle pointer-events-none select-none" : ""
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bg-card text-[24px] leading-none shadow-card">
          {f.emoji}
        </span>
        <span>
          <span className="block text-[16px] font-bold tracking-tight text-text-1">
            {f.title}
          </span>
          <span className="block text-[12px] leading-snug text-text-3">{f.subtitle}</span>
        </span>
      </Link>
      {editing && (
        <button
          aria-label={`Sembunyikan ${f.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onHide}
          className="pop-in absolute -left-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-text-1 text-[16px] font-bold leading-none text-bg-app shadow-float"
        >
          −
        </button>
      )}
    </li>
  );
}
