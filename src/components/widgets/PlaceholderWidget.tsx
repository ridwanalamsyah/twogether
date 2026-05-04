"use client";

import { WidgetShell } from "./WidgetShell";

export function PlaceholderWidget({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <WidgetShell title={title}>
      <p className="text-sm text-text-3">{hint}</p>
    </WidgetShell>
  );
}
