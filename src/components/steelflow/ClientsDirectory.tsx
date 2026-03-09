"use client";

import { useMemo, useState } from "react";
import type { ClientRecord } from "@/types/client";

const STATUS_STYLES: Record<ClientRecord["status"], string> = {
  active:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  review:
    "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  inactive:
    "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  draft:
    "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_LABELS: Record<ClientRecord["status"], string> = {
  active: "Active",
  review: "In review",
  inactive: "Inactive",
  draft: "Draft",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLastActivity(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ClientsDirectory({ clients }: { clients: ClientRecord[] }) {
  const [query, setQuery] = useState("");

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) =>
      [
        client.id,
        client.name,
        client.companyCode,
        client.email,
        client.country,
        client.city,
        client.accountManager,
        ...client.tags,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [clients, query]);

  const activeClients = clients.filter((client) => client.status === "active").length;
  const totalOpenOrders = clients.reduce(
    (total, client) => total + client.activeOrders,
    0
  );

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Clients
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Client Directory
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Mock data rendered with the same loop-based structure we can later
            replace with a Supabase query result.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Total clients
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {clients.length}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Active
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {activeClients}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Open orders
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {totalOpenOrders}
            </p>
          </div>
        </div>
      </section>

      <section className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Search clients
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by name, email, country, account manager, code, or tags.
            </p>
          </div>

          <div className="relative w-full lg:max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="Search clients..."
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredClients.map((client) => (
          <article
            key={client.id}
            className={`group steelflow-card-hover ${
              ["steelflow-card-hover--tl", "steelflow-card-hover--tr", "steelflow-card-hover--bl", "steelflow-card-hover--br"][Number(client.id.slice(-1)) % 4]
            } rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  {client.id}
                </p>
                <h3 className="mt-2 truncate text-xl font-black text-slate-900 dark:text-white">
                  {client.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {client.companyCode} • {client.city}, {client.country}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLES[client.status]}`}
              >
                {STATUS_LABELS[client.status]}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Open orders
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {client.activeOrders}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Lifetime value
                </p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {formatMoney(client.lifetimeValue)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400">
                  mail
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {client.email}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Primary contact
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400">
                  call
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {client.phone}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Account manager: {client.accountManager}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400">
                  schedule
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatLastActivity(client.lastActivity)}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Last activity
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {client.tags.map((tag) => (
                <span
                  key={`${client.id}-${tag}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      {filteredClients.length === 0 && (
        <section className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            No clients found
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try another search term to match your mock client dataset.
          </p>
        </section>
      )}
    </main>
  );
}
