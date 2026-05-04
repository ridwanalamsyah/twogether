"use client";

import { useEffect, useState } from "react";
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
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboard, type WidgetConfig } from "@/stores/dashboard";
import { useAuth } from "@/stores/auth";
import { WIDGET_REGISTRY } from "@/components/widgets/registry";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  /** When true, widgets are draggable and show edit chrome. */
  editing: boolean;
}

const SIZE_TO_SPAN: Record<WidgetConfig["size"], string> = {
  sm: "col-span-1",
  md: "col-span-2",
  lg: "col-span-2",
};

export function DashboardGrid({ editing }: DashboardGridProps) {
  const userId = useAuth((s) => s.userId);
  const layout = useDashboard((s) => s.layout);
  const loaded = useDashboard((s) => s.loaded);
  const load = useDashboard((s) => s.load);
  const reorder = useDashboard((s) => s.reorder);
  const save = useDashboard((s) => s.save);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void load(userId).then(() => setHydrated(true));
  }, [userId, load]);

  // Auto-save layout changes.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const t = setTimeout(() => void save(userId), 400);
    return () => clearTimeout(t);
  }, [layout, hydrated, userId, save]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  const visible = layout.filter((w) => w.enabled);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = layout.findIndex((w) => w.id === active.id);
    const to = layout.findIndex((w) => w.id === over.id);
    if (from === -1 || to === -1) return;
    reorder(from, to);
  }

  if (!loaded) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={visible.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-2.5 px-5 pb-6 pt-4">
          {visible.map((w) => (
            <SortableWidget key={w.id} widget={w} editing={editing} />
          ))}
          {visible.length === 0 && (
            <div className="col-span-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-3">
              Semua widget dimatikan. Buka Customize untuk mengaktifkan.
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableWidget({
  widget,
  editing,
}: {
  widget: WidgetConfig;
  editing: boolean;
}) {
  const meta = WIDGET_REGISTRY[widget.kind];
  const Component = meta.Component;
  const sortable = useSortable({ id: widget.id, disabled: !editing });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        SIZE_TO_SPAN[widget.size],
        isDragging && "is-dragging",
        "relative",
      )}
      {...attributes}
    >
      {editing && (
        <button
          {...listeners}
          aria-label="Drag widget"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-app/80 text-text-3 backdrop-blur"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <circle cx="5" cy="4" r="1.4" />
            <circle cx="11" cy="4" r="1.4" />
            <circle cx="5" cy="8" r="1.4" />
            <circle cx="11" cy="8" r="1.4" />
            <circle cx="5" cy="12" r="1.4" />
            <circle cx="11" cy="12" r="1.4" />
          </svg>
        </button>
      )}
      <Component />
    </div>
  );
}
