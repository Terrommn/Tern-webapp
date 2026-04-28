"use client";

import { useEffect, useRef, useState } from "react";
import type { XPToastItem } from "@/types/gamification";

type XPToastProps = {
  toasts: XPToastItem[];
  onDismiss: (id: string) => void;
};

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: XPToastItem;
  onDismiss: (id: string) => void;
}) {
  const [state, setState] = useState<"enter" | "visible" | "exit">("enter");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger enter -> visible
    const enterTimer = setTimeout(() => setState("visible"), 20);

    // Auto-dismiss after 3s
    timerRef.current = setTimeout(() => {
      setState("exit");
    }, 3000);

    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state === "exit") {
      const removeTimer = setTimeout(() => onDismiss(toast.id), 300);
      return () => clearTimeout(removeTimer);
    }
  }, [state, toast.id, onDismiss]);

  const translateClass =
    state === "enter"
      ? "translate-x-[120%] opacity-0"
      : state === "exit"
        ? "translate-x-[120%] opacity-0"
        : "translate-x-0 opacity-100";

  return (
    <div
      className={[
        "pointer-events-auto flex items-center gap-3 rounded-xl border-l-4 border-l-primary bg-slate-900 px-4 py-3 shadow-lg transition-all duration-300 ease-out",
        translateClass,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-lg text-primary">
        bolt
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {toast.xpAmount > 0 && (
            <span className="mr-1 text-primary">+{toast.xpAmount} XP</span>
          )}
          <span className="text-slate-300">
            {toast.xpAmount > 0 ? "— " : ""}
            {toast.message}
          </span>
        </p>
      </div>
    </div>
  );
}

export function XPToast({ toasts, onDismiss }: XPToastProps) {
  // Show at most 3 toasts
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {visible.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
