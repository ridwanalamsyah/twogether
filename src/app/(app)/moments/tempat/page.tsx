"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useMemo } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/stores/auth";
import { useMoments } from "@/stores/data";
import { formatDateShort } from "@/lib/utils";
import { mapsUrl, summarizePlaces } from "@/lib/places";

/** Every place you've been together, from the moments that name one. */
export default function PlacesPage() {
  const userId = useAuth((s) => s.userId);
  const moments = useMoments(userId);
  const places = useMemo(() => summarizePlaces(moments ?? []), [moments]);

  return (
    <div className="animate-in pb-10">
      <AppHeader
        title="Tempat kita"
        subtitle={places.length ? `${places.length} tempat dari momen kalian` : undefined}
      />
      <div className="px-5 pt-3">
        {moments && places.length === 0 ? (
          <EmptyState
            title="Belum ada tempat"
            body="Isi kolom Tempat saat menulis momen. Semua tempat kalian akan terkumpul di sini."
          />
        ) : (
          <ul className="surface divide-y divide-[color:var(--hairline)] overflow-hidden">
            {places.map((p, i) => (
              <li key={p.name} className="slide-up flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bg-elev1 text-accent">
                  <MapPin size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-text-1">{p.name}</span>
                  <span className="block text-[12px] text-text-3">
                    {p.count}× ·{" "}
                    {p.first === p.last
                      ? formatDateShort(p.last)
                      : `${formatDateShort(p.first)} – ${formatDateShort(p.last)}`}
                  </span>
                </span>
                <a
                  href={mapsUrl(p.name)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Buka ${p.name} di Maps`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg-elev1 text-text-2 active:scale-90"
                >
                  <ExternalLink size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
