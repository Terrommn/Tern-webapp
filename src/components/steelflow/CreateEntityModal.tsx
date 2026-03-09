"use client";

import type { ReactNode } from "react";

type CreateEntityModalProps = {
  open: boolean;
  title: string;
  description: string;
  formId: string;
  submitLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function CreateEntityModal({
  open,
  title,
  description,
  formId,
  submitLabel,
  onClose,
  children,
}: CreateEntityModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />

      <div className="steelflow-card-hover steelflow-card-hover--tl relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Create record
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          <button
            aria-label="Close modal"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            type="button"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            form={formId}
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
