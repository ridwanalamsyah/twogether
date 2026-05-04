"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MediaRecorder-based voice capture. Saves the recording as a base64 data URL
 * (audio/webm; iOS will use audio/mp4) so it persists in IndexedDB without
 * any backend.
 *
 * Quality: capped at ~32 kbps mono via the native recorder defaults — fine
 * for short voice notes (a few minutes max). For longer recordings consider
 * blob storage instead.
 */
export function VoiceRecorder({
  value,
  onChange,
}: {
  value?: string;
  onChange: (next: string | undefined) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Browser tidak mendukung perekaman.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current[0]?.type || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result?.toString());
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      startedAtRef.current = Date.now();
      setSeconds(0);
      tickRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (e) {
      setError(
        (e as Error).message?.includes("denied")
          ? "Akses mic ditolak. Aktifkan di Settings → Safari."
          : "Tidak bisa membuka mic.",
      );
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRecording(false);
  }

  function clear() {
    onChange(undefined);
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2 rounded-md bg-bg-elev2 p-2">
          <audio controls src={value} className="h-9 flex-1" />
          <button
            type="button"
            onClick={clear}
            className="rounded-full bg-bg-elev3 px-2.5 py-1 text-[10px] font-semibold text-[color:var(--negative)]"
          >
            Hapus
          </button>
        </div>
      ) : recording ? (
        <button
          type="button"
          onClick={stop}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--negative)] px-3 py-2 text-sm font-semibold text-white"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Stop · {String(seconds).padStart(2, "0")}s
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-bg-elev2 px-3 py-2 text-sm font-semibold text-text-2"
        >
          🎤 Rekam suara
        </button>
      )}
      {error && (
        <div className="mt-1 text-[11px] text-[color:var(--negative)]">{error}</div>
      )}
    </div>
  );
}
