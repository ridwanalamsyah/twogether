"use client";

import { create } from "zustand";

/** Shared UI state for the app shell (phone tab bar + laptop sidebar). */
interface UiState {
  captureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
}

export const useUi = create<UiState>((set) => ({
  captureOpen: false,
  openCapture: () => set({ captureOpen: true }),
  closeCapture: () => set({ captureOpen: false }),
}));
