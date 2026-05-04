"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { useDashboard, type WidgetSize } from "@/stores/dashboard";
import { WIDGET_REGISTRY } from "@/components/widgets/registry";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  DndContext,
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "S",
  md: "M",
  lg: "L",
};

export default function CustomizeDashboardPage() {
  const userId = useAuth((s) => s.userId);
  const layout = useDashboard((s) => s.layout);
  const load = useDashboard((s) => s.load);
  const save = useDashboard((s) => s.save);
  const reorder = useDashboard((s) => s.reorder);
  const toggle = useDashboard((s) => s.toggle);
  const resize = useDashboard((s) => s.resize);
  const reset = useDashboard((s) => s.resetDefault);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => void save(userId), 400);
    return () => clearTimeout(t);
  }, [layout, userId, save]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = layout.findIndex((w) => w.id === active.id);
    const to = layout.findIndex((w) => w.id === over.id);
    if (from === -1 || to === -1) return;
    reorder(from, to);
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Customize Dashboard"
        subtitle="Notion-style widgets"
        actions={
          <Link
            href="/home"
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Selesai
          </Link>
        }
      />

      <div className="px-4 pb-8">
        <div className="mb-3 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
          Drag untuk menyusun ulang. Tap toggle untuk menampilkan/menyembunyikan.
          Tap S/M/L untuk ubah ukuran.
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={layout.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {layout.map((w) => {
                const meta = WIDGET_REGISTRY[w.kind];
                return (
                  <SortableRow key={w.id} id={w.id}>
                    <div className="flex items-center gap-3">
                      <DragHandle />
                      <span className="text-2xl">{meta.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text-1">
                          {meta.label}
                        </div>
                        <div className="truncate text-[11px] text-text-3">
                          {meta.description}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(["sm", "md", "lg"] as WidgetSize[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => resize(w.id, s)}
                            className={`h-7 w-7 rounded-md text-[11px] font-bold transition-colors ${
                              w.size === s
                                ? "bg-accent text-accent-fg"
                                : "bg-bg-elev2 text-text-3"
                            }`}
                          >
                            {SIZE_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <Toggle
                        on={w.enabled}
                        onClick={() => toggle(w.id)}
                      />
                    </div>
                  </SortableRow>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>

        <button
          onClick={reset}
          className="btn-ghost mt-5 w-full text-sm"
        >
          Reset ke default
        </button>
      </div>
    </div>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`surface px-3.5 py-3 ${isDragging ? "is-dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </li>
  );
}

function DragHandle() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 flex-shrink-0 text-text-4"
      fill="currentColor"
    >
      <circle cx="5" cy="4" r="1.3" />
      <circle cx="11" cy="4" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="11" cy="12" r="1.3" />
    </svg>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-bg-elev3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
