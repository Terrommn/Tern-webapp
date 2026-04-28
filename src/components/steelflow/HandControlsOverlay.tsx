"use client";

import { useEffect, useRef, type RefObject } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import type { GestureName, HandFrame, Handedness } from "@/lib/hand-frame";
import type { HandTrackerStatus } from "@/lib/hooks/useHandTracker";

const PREVIEW_WIDTH = 200;
const PREVIEW_HEIGHT = 150;

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

type CheatGesture = "Open_Palm" | "Victory" | "Closed_Fist";

const CHEAT_SHEET: Array<{ gesture: CheatGesture; emoji: string; label: string }> = [
  { gesture: "Open_Palm", emoji: "✋", label: "Orbit" },
  { gesture: "Victory", emoji: "✌️", label: "Zoom" },
  { gesture: "Closed_Fist", emoji: "✊", label: "Fijar" },
];

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  frameRef: RefObject<HandFrame | null>;
  status: HandTrackerStatus;
  gestureLabel: GestureName;
  gestureScore: number;
  handedness: Handedness | null;
  error: string | null;
  sensitivity: number;
  sensitivityMin: number;
  sensitivityMax: number;
  onSensitivityChange: (value: number) => void;
  onReset: () => void;
  onClose: () => void;
};

function statusColor(status: HandTrackerStatus): string {
  switch (status) {
    case "ready":
      return "#22c55e";
    case "loading":
      return "#eab308";
    case "error":
      return "#d41111";
    default:
      return "#64748b";
  }
}

function statusText(status: HandTrackerStatus): string {
  switch (status) {
    case "loading":
      return "Cargando modelo...";
    case "ready":
      return "Listo";
    case "error":
      return "Error";
    default:
      return "Inactivo";
  }
}

export default function HandControlsOverlay({
  videoRef,
  frameRef,
  status,
  gestureLabel,
  gestureScore,
  handedness,
  error,
  sensitivity,
  sensitivityMin,
  sensitivityMax,
  onSensitivityChange,
  onReset,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const frame = frameRef.current;
      if (frame && frame.landmarks.length === 21) {
        const isActive =
          (frame.gesture === "Open_Palm" || frame.gesture === "Victory") &&
          frame.gestureScore >= 0.3;
        const dotColor = isActive ? "#22c55e" : "#f8fafc";
        const lineColor = isActive
          ? "rgba(34,197,94,0.9)"
          : "rgba(212,17,17,0.9)";

        ctx.lineWidth = 2;
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        for (const [a, b] of HAND_CONNECTIONS) {
          const la = frame.landmarks[a];
          const lb = frame.landmarks[b];
          ctx.moveTo(la.x * w, la.y * h);
          ctx.lineTo(lb.x * w, lb.y * h);
        }
        ctx.stroke();

        ctx.fillStyle = dotColor;
        for (const lm of frame.landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "#d41111";
        ctx.beginPath();
        ctx.arc(frame.palm.x * w, frame.palm.y * h, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [frameRef]);

  const sensitivityActive = gestureScore >= 0.3;

  return (
    <div className="absolute left-4 top-4 z-10 w-[220px] rounded-xl border border-slate-700/60 bg-slate-900/95 p-2 shadow-xl backdrop-blur-sm">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className="block h-[150px] w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className="pointer-events-none absolute inset-0 h-[150px] w-full"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor(status) }}
          />
          <span className="truncate text-[11px] font-semibold text-slate-200">
            {status === "ready"
              ? `${gestureLabel}${
                  gestureScore > 0
                    ? ` ${(gestureScore * 100).toFixed(0)}%`
                    : ""
                }${
                  handedness
                    ? ` · ${handedness === "Right" ? "Der" : "Izq"}`
                    : ""
                }`
              : statusText(status)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset cámara"
            title="Reset cámara"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <AppIcon name="rotate_ccw" className="text-sm" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar control por gestos"
            title="Cerrar"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <AppIcon name="close" className="text-sm" />
          </button>
        </div>
      </div>

      {status === "ready" && (
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {CHEAT_SHEET.map((c) => {
            const isOn = sensitivityActive && gestureLabel === c.gesture;
            return (
              <div
                key={c.gesture}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  isOn
                    ? "bg-[#d41111] text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <span className="text-sm leading-none">{c.emoji}</span>
                <span>{c.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {status === "ready" && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Sens
          </span>
          <input
            type="range"
            min={sensitivityMin}
            max={sensitivityMax}
            step={0.1}
            value={sensitivity}
            onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
            aria-label="Sensibilidad de gestos"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-[#d41111]"
          />
          <span className="w-8 text-right text-[10px] font-semibold text-slate-300">
            {sensitivity.toFixed(1)}x
          </span>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[10px] leading-tight text-red-400">{error}</p>
      )}
    </div>
  );
}
