"use client";

import { create } from "zustand";

/** Shared UI state for the app shell (phone tab bar + laptop sidebar). */
export type CaptureAction = "manual" | "scan" | "voice";

interface UiState {
  captureOpen: boolean;
  /** How the + menu asked to start: type it, photo of a receipt, or speak. */
  captureAction: CaptureAction;
  openCapture: (action?: CaptureAction) => void;
  closeCapture: () => void;
}

export const useUi = create<UiState>((set) => ({
  captureOpen: false,
  captureAction: "manual",
  openCapture: (action = "manual") => set({ captureOpen: true, captureAction: action }),
  closeCapture: () => set({ captureOpen: false }),
}));
