"use client";

import { useState } from "react";
import type { MasteryPath } from "@/types/gamification";

type MasteryPathViewProps = {
  paths: MasteryPath[];
};

const PATH_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  order_flow: {
    label: "Flujo de Ordenes",
    icon: "receipt_long",
    color: "#d41111",
  },
  client_relations: {
    label: "Relaciones con Clientes",
    icon: "groups",
    color: "#f59e0b",
  },
  product_specialist: {
    label: "Especialista de Producto",
    icon: "inventory_2",
    color: "#10b981",
  },
};

const TIER_LABELS = [
  "Novato",
  "Aprendiz",
  "Competente",
  "Experto",
  "Maestro",
];

const MAX_TIERS = 5;

function PathColumn({
  path,
  meta,
}: {
  path: MasteryPath | null;
  meta: { label: string; icon: string; color: string };
}) {
  const currentTier = path?.current_tier ?? 0;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Path header */}
      <div className="mb-2 text-center">
        <span
          className="material-symbols-outlined text-2xl"
          style={{ color: meta.color }}
        >
          {meta.icon}
        </span>
        <p className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white">
          {meta.label}
        </p>
      </div>

      {/* Nodes (bottom to top = tier 0 to 4) */}
      <div className="relative flex flex-col-reverse items-center gap-0">
        {Array.from({ length: MAX_TIERS }).map((_, tierIdx) => {
          const isCompleted = tierIdx < currentTier;
          const isCurrent = tierIdx === currentTier;
          const isLocked = tierIdx > currentTier;

          return (
            <div key={tierIdx} className="flex flex-col items-center">
              {/* Connector line (not for the first node) */}
              {tierIdx > 0 && (
                <div
                  className="h-6 w-0.5"
                  style={{
                    backgroundColor: isCompleted ? meta.color : "#334155",
                  }}
                />
              )}

              {/* Node */}
              <div
                className={[
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted
                    ? "border-transparent text-white"
                    : isCurrent
                      ? "border-current"
                      : "border-slate-300 dark:border-slate-700",
                ].join(" ")}
                style={{
                  backgroundColor: isCompleted ? meta.color : "transparent",
                  borderColor: isCurrent ? meta.color : undefined,
                }}
                title={TIER_LABELS[tierIdx]}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-base text-white">
                    check
                  </span>
                ) : isCurrent ? (
                  <span
                    className="text-xs font-bold"
                    style={{ color: meta.color }}
                  >
                    {tierIdx + 1}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-base text-slate-400 dark:text-slate-600">
                    lock
                  </span>
                )}

                {/* Current tier ring animation */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 animate-ping rounded-full opacity-20"
                    style={{ backgroundColor: meta.color }}
                  />
                )}
              </div>

              {/* Tier label */}
              <p
                className={[
                  "mt-0.5 text-[9px] font-medium",
                  isCompleted || isCurrent
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400 dark:text-slate-600",
                ].join(" ")}
              >
                {TIER_LABELS[tierIdx]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MasteryPathView({ paths }: MasteryPathViewProps) {
  const pathKeys = ["order_flow", "client_relations", "product_specialist"];
  const pathMap = new Map(paths.map((p) => [p.path_key, p]));

  // Mobile: tabbed view. Desktop: side by side.
  const [mobileTab, setMobileTab] = useState(0);

  return (
    <div>
      {/* Mobile tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900 md:hidden">
        {pathKeys.map((key, idx) => {
          const meta = PATH_META[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(idx)}
              className={[
                "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
                mobileTab === idx
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {meta.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6">
        {pathKeys.map((key) => (
          <PathColumn
            key={key}
            path={pathMap.get(key as MasteryPath["path_key"]) ?? null}
            meta={PATH_META[key]}
          />
        ))}
      </div>

      {/* Mobile: single column */}
      <div className="md:hidden">
        <PathColumn
          path={
            pathMap.get(
              pathKeys[mobileTab] as MasteryPath["path_key"],
            ) ?? null
          }
          meta={PATH_META[pathKeys[mobileTab]]}
        />
      </div>
    </div>
  );
}
