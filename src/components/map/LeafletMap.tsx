"use client";

import "leaflet/dist/leaflet.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type * as L from "leaflet";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Emoji or short text drawn inside the pin. */
  label: string;
  /** Pin colour. */
  color?: string;
  title?: string;
  /** Larger, pulsing pin (e.g. a live location). */
  live?: boolean;
}

export interface LeafletMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

/**
 * Thin Leaflet wrapper (loaded only in the browser). Tiles: OpenStreetMap.
 * For a commercial launch, switch TILE_URL to a paid provider (MapTiler,
 * Stadia…) as OSM's free tile servers are for light use only.
 */
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const LeafletMap = forwardRef<
  LeafletMapHandle,
  {
    markers: MapMarker[];
    center?: [number, number];
    zoom?: number;
    onMarkerClick?: (id: string) => void;
    onMapClick?: (lat: number, lng: number) => void;
    className?: string;
  }
>(function LeafletMap({ markers, center = [-2.5, 117], zoom = 4, onMarkerClick, onMapClick, className }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const clickRef = useRef(onMapClick);
  const markerClickRef = useRef(onMarkerClick);
  clickRef.current = onMapClick;
  markerClickRef.current = onMarkerClick;
  const fitted = useRef(false);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, z = 15) => map.current?.flyTo([lat, lng], z, { duration: 0.8 }),
  }));

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !el.current || map.current) return;
      lib.current = leaflet;
      const m = leaflet.map(el.current, { zoomControl: false, attributionControl: true }).setView(center, zoom);
      leaflet.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
      m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      leaflet.control.zoom({ position: "bottomright" }).addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      layer.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const leaflet = lib.current;
    const m = map.current;
    const g = layer.current;
    if (!leaflet || !m || !g) return;
    g.clearLayers();
    for (const mk of markers) {
      const size = mk.live ? 44 : 38;
      const icon = leaflet.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        html: `<div class="map-pin${mk.live ? " map-pin-live" : ""}" style="--pin:${mk.color ?? "var(--accent)"};width:${size}px;height:${size}px"><span>${escapeHtml(mk.label)}</span></div>`,
      });
      leaflet
        .marker([mk.lat, mk.lng], { icon, title: mk.title })
        .on("click", () => markerClickRef.current?.(mk.id))
        .addTo(g);
    }
    if (!fitted.current && markers.length) {
      fitted.current = true;
      if (markers.length === 1) m.setView([markers[0].lat, markers[0].lng], 13);
      else m.fitBounds(leaflet.latLngBounds(markers.map((x) => [x.lat, x.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
    }
  }

  useEffect(draw);

  return <div ref={el} className={className} />;
});
