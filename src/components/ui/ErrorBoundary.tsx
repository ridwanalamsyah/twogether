"use client";

import React from "react";

interface State {
  error: Error | null;
}

/**
 * Catches render errors in any subtree and shows a friendly recovery panel.
 * Avoids the dreaded white screen of death — especially important on iOS
 * where the user can't open the dev console.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== "undefined") {
      console.error("[bareng] caught:", error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 text-4xl">😵‍💫</div>
        <div className="text-base font-bold">Ada yang tidak beres</div>
        <p className="mx-auto mt-1 max-w-[300px] text-xs text-text-3">
          App ketemu error tak terduga. Data lokal kamu aman — coba reload
          atau lanjut ke halaman lain.
        </p>
        <pre className="mt-3 max-h-32 max-w-[320px] overflow-auto rounded bg-bg-elev2 p-2 text-left text-[10px] text-text-3">
          {this.state.error.message}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            onClick={this.reset}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
          >
            Coba lagi
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.replace("/home");
            }}
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Ke beranda
          </button>
        </div>
      </div>
    );
  }
}
