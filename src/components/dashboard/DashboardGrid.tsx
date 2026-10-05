"use client";

import { useEffect, useState } from "react";
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
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
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
    // Mouse: start after a small move. Finger: short press, so normal
    // scrolling still works while arranging.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = layout.filter((w) => w.enabled);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = layout.findIndex((w) => w.id === active.id);
    const to = layout.findIndex((w) => w.id === over.id);
    if (from === -1 || to === -1) return;
    reorder(from, to);
    hapticSuccess();
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
      onDragStart={() => hapticTap()}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={visible.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-2.5 px-5 pb-6 pt-4 md:gap-4 md:px-8 lg:grid-cols-4">
          {visible.map((w, i) => (
            <SortableWidget key={w.id} widget={w} editing={editing} index={i} />
          ))}
          {visible.length === 0 && (
            <div className="col-span-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-3">
              Belum ada kartu. Tap Susun untuk menambahkan.
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
  index,
}: {
  widget: WidgetConfig;
  editing: boolean;
  index: number;
}) {
  const meta = WIDGET_REGISTRY[widget.kind];
  const Component = meta.Component;
  const toggle = useDashboard((s) => s.toggle);
  const sortable = useSortable({ id: widget.id, disabled: !editing });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: editing ? "manipulation" : undefined,
      }}
      className={cn(
        SIZE_TO_SPAN[widget.size],
        "relative",
        editing && "cursor-grab active:cursor-grabbing",
        isDragging && "is-dragging",
      )}
      {...(editing ? attributes : {})}
      {...(editing ? listeners : {})}
    >
      {/* While arranging, the whole card is the handle and its own buttons
          are paused, so a drag never turns into an accidental tap. */}
      <div
        className={cn(
          editing && "pointer-events-none select-none",
          editing && !isDragging && "edit-jiggle",
        )}
        style={editing ? { animationDelay: `${(index % 3) * -0.11}s` } : undefined}
      >
        <Component />
      </div>
      {editing && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-[26px] border-2 border-dashed opacity-50"
            style={{ borderColor: "var(--accent)" }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => toggle(widget.id)}
            aria-label={`Sembunyikan ${meta.label}`}
            className="pop-in absolute -left-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-text-1 text-[16px] font-bold leading-none text-bg-app shadow-float"
          >
            −
          </button>
        </>
      )}
    </div>
  );
}
