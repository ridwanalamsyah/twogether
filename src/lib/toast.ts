"use client";

import { create } from "zustand";

/** One small app-wide toast ("Makan sudah 80% dari batas"). */
interface ToastState {
  text: string | null;
  tone: "info" | "warn" | "danger";
  show: (text: string, tone?: ToastState["tone"]) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  text: null,
  tone: "info",
  show: (text, tone = "info") => {
    clearTimeout(timer);
    set({ text, tone });
    timer = setTimeout(() => set({ text: null }), 4500);
  },
  hide: () => set({ text: null }),
}));

export const toast = (text: string, tone?: ToastState["tone"]) => useToast.getState().show(text, tone);
