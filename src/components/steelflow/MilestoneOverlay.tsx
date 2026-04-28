"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";

type MilestoneOverlayProps = {
  visible: boolean;
  title: string;
  description: string;
  xp: number;
  icon: string;
  onDismiss: () => void;
};

export function MilestoneOverlay({
  visible,
  title,
  description,
  xp,
  icon,
  onDismiss,
}: MilestoneOverlayProps) {
  const [state, setState] = useState<"hidden" | "enter" | "visible" | "exit">(
    "hidden",
  );

  useEffect(() => {
    if (visible) {
      setState("enter");
      // Trigger enter -> visible
      const enterTimer = setTimeout(() => setState("visible"), 20);
      // Auto-dismiss after 4s
      const autoTimer = setTimeout(() => setState("exit"), 4000);
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(autoTimer);
      };
    } else {
      setState("hidden");
    }
  }, [visible]);

  useEffect(() => {
    if (state === "exit") {
      const removeTimer = setTimeout(() => {
        setState("hidden");
        onDismiss();
      }, 400);
      return () => clearTimeout(removeTimer);
    }
  }, [state, onDismiss]);

  if (state === "hidden") return null;

  const backdropOpacity =
    state === "enter" ? "opacity-0" : state === "exit" ? "opacity-0" : "opacity-100";

  const cardTransform =
    state === "enter"
      ? "scale-75 opacity-0"
      : state === "exit"
        ? "scale-90 opacity-0"
        : "scale-100 opacity-100";

  return (
    <div
      className={[
        "fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-300",
        backdropOpacity,
      ].join(" ")}
      onClick={() => setState("exit")}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={[
          "relative flex max-w-sm flex-col items-center gap-4 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-2xl transition-all duration-400 ease-out dark:border-slate-700 dark:bg-slate-900",
          cardTransform,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow behind icon */}
        <div className="absolute -top-6 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl" />

        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <AppIcon className="text-3xl text-primary" name={icon} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>

        {/* XP earned */}
        {xp > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5">
            <AppIcon className="text-base text-primary" name="bolt" />
            <span className="text-sm font-bold text-primary">+{xp} XP</span>
          </div>
        )}

        {/* Dismiss hint */}
        <p className="text-[10px] text-slate-400">
          Toca para cerrar
        </p>
      </div>
    </div>
  );
}
