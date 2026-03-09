"use client";

import { useMemo, useState } from "react";
import type { OrderRecord } from "@/types/order";

type StatusFilter = "all" | OrderRecord["status"];

const PRIORITY_STYLES: Record<OrderRecord["priority"], string> = {
  critical:
    "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  high: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  medium:
    "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
};

const AUTO_MATCH_STYLES: Record<OrderRecord["autoMatch"], string> = {
  matched:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  partial:
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  missing:
    "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

const AUTO_MATCH_LABELS: Record<OrderRecord["autoMatch"], string> = {
  matched: "Matched",
  partial: "Partial",
  missing: "Missing",
};

const STATUS_STYLES: Record<OrderRecord["status"], string> = {
  ready:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  in_review:
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  blocked:
    "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

const STATUS_LABELS: Record<OrderRecord["status"], string> = {
  ready: "Ready",
  in_review: "In review",
  blocked: "Blocked",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function OrdersWorkspace({ orders }: { orders: OrderRecord[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;

      const matchesQuery =
        normalizedQuery.length === 0
          ? true
          : [
              order.id,
              order.clientName,
              order.partNumber,
              order.plant,
              order.accountOwner,
            ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    filteredOrders[0] ??
    orders[0];

  const readyCount = orders.filter((order) => order.status === "ready").length;
  const blockedCount = orders.filter((order) => order.status === "blocked").length;
  const totalTonnage = orders.reduce((sum, order) => sum + order.tonnage, 0);
  const avgProgress = Math.round(
    orders.reduce((sum, order) => sum + order.progress, 0) / orders.length
  );

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Orders
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Order operations redesigned for focus and clarity
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              A cleaner workspace with more spacing, stronger hierarchy, and a
              card-based queue that is ready to be connected to Supabase later.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              type="button"
            >
              Create order
            </button>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              type="button"
            >
              Import batch
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Total orders
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {orders.length}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Active mock queue ready for future DB wiring.
          </p>
        </div>

        <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Ready to release
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {readyCount}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Orders with validated specs and stable routing.
          </p>
        </div>

        <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Blocked
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {blockedCount}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Orders that still need data or customer confirmation.
          </p>
        </div>

        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Avg. progress
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {avgProgress}%
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {totalTonnage.toFixed(1)}T flowing across the visible queue.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Search and filter orders
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search by order ID, client, part number, plant, or owner.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <div className="relative min-w-0 lg:w-80">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    search
                  </span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Search orders..."
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="ready">Ready</option>
                  <option value="in_review">In review</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {filteredOrders.map((order, index) => {
              const isSelected = selectedOrder?.id === order.id;
              const tiltClass = [
                "steelflow-card-hover--tl",
                "steelflow-card-hover--tr",
                "steelflow-card-hover--bl",
                "steelflow-card-hover--br",
              ][index % 4];

              return (
                <button
                  key={order.id}
                  className={[
                    "steelflow-card-hover w-full rounded-[28px] border bg-white p-6 text-left shadow-sm dark:bg-slate-950",
                    tiltClass,
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 dark:border-primary"
                      : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                            {order.id}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${PRIORITY_STYLES[order.priority]}`}
                          >
                            {order.priority}
                          </span>
                        </div>

                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                          {order.clientName}
                        </h3>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Part {order.partNumber} • {order.plant} • Owner{" "}
                          {order.accountOwner}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${AUTO_MATCH_STYLES[order.autoMatch]}`}
                        >
                          {AUTO_MATCH_LABELS[order.autoMatch]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Received
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(order.receivedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Due date
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(order.dueDate)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Tonnage
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {order.tonnage.toFixed(1)}T
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Progress
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {order.progress}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <span>Execution progress</span>
                        <span>{order.progress}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                No orders found
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your search term or selected status.
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          {selectedOrder && (
            <div className="steelflow-card-hover steelflow-card-hover--br sticky top-6 flex flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  Selected order
                </p>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {selectedOrder.id}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {selectedOrder.clientName} • {selectedOrder.partNumber}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLES[selectedOrder.status]}`}
                  >
                    {STATUS_LABELS[selectedOrder.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Plant
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedOrder.plant}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Owner
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedOrder.accountOwner}
                  </p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Planning note
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {selectedOrder.notes}
                </p>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--bl space-y-3 rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Blockers
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    {selectedOrder.blockers.length}
                  </span>
                </div>

                {selectedOrder.blockers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.blockers.map((blocker) => (
                      <div
                        key={blocker}
                        className="rounded-2xl bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                      >
                        {blocker}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    No active blockers detected for this order.
                  </div>
                )}
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tr space-y-3 rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {selectedOrder.recommendations.map((recommendation) => (
                    <div
                      key={recommendation}
                      className="rounded-2xl bg-sky-500/5 px-4 py-3 text-sm text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                    >
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  type="button"
                >
                  Open order workspace
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  type="button"
                >
                  Export planning summary
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
