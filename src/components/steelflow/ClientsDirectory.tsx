"use client";

import { useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";

type ClientFormState = {
  name: string;
  max_weight: string;
  min_weight: string;
  max_length: string;
  max_width: string;
  max_height: string;
  orientation: string;
  max_rolls: string;
  internal_diameter: string;
  external_diameter: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetric(value: number | null, suffix: string) {
  return value === null ? "Not set" : `${value}${suffix}`;
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function parseNullableInteger(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number.parseInt(trimmed, 10);
}

function createClientFormState(): ClientFormState {
  return {
    name: "",
    max_weight: "",
    min_weight: "",
    max_length: "",
    max_width: "",
    max_height: "",
    orientation: "",
    max_rolls: "",
    internal_diameter: "",
    external_diameter: "",
  };
}

export function ClientsDirectory({
  clients: initialClients,
  orders,
}: {
  clients: ClientRecord[];
  orders: OrderRecord[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<ClientFormState>(createClientFormState());

  const orderCountByClient = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.client_id] = (acc[order.client_id] ?? 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) =>
      [client.id, client.name, client.orientation ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [clients, query]);

  const avgMaxWeight = Math.round(
    clients
      .filter((client) => client.max_weight !== null)
      .reduce((sum, client) => sum + (client.max_weight ?? 0), 0) /
      Math.max(
        1,
        clients.filter((client) => client.max_weight !== null).length
      )
  );
  const verticalClients = clients.filter(
    (client) => client.orientation === "vertical"
  ).length;
  const totalOrders = orders.length;

  function handleChange<K extends keyof ClientFormState>(
    key: K,
    value: ClientFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleOpenCreate() {
    setForm(createClientFormState());
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setForm(createClientFormState());
  }

  function handleCreateClient(event: React.FormEvent) {
    event.preventDefault();

    const now = new Date().toISOString();
    const newClient: ClientRecord = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      max_weight: parseNullableNumber(form.max_weight),
      min_weight: parseNullableNumber(form.min_weight),
      max_length: parseNullableNumber(form.max_length),
      max_width: parseNullableNumber(form.max_width),
      max_height: parseNullableNumber(form.max_height),
      orientation: form.orientation.trim() || null,
      max_rolls: parseNullableInteger(form.max_rolls),
      internal_diameter: parseNullableNumber(form.internal_diameter),
      external_diameter: parseNullableNumber(form.external_diameter),
      created_at: now,
      updated_at: now,
    };

    setClients((current) => [newClient, ...current]);
    setQuery("");
    handleCloseCreate();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Clients
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Shipping and handling constraints by client
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Every field shown here matches the `clients` schema directly, so this
            screen is ready to map cleanly to Supabase rows.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              Avg max weight
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {avgMaxWeight}kg
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Vertical
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {verticalClients}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Linked orders
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {totalOrders}
            </p>
          </div>
        </div>
      </section>

      <section className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Search client rules
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by UUID, client name, or orientation.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-96">
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

            <button
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              type="button"
              onClick={handleOpenCreate}
            >
              New client
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredClients.map((client, index) => {
          const tiltClass = [
            "steelflow-card-hover--tl",
            "steelflow-card-hover--tr",
            "steelflow-card-hover--bl",
            "steelflow-card-hover--br",
          ][index % 4];
          const linkedOrders = orderCountByClient[client.id] ?? 0;

          return (
            <article
              key={client.id}
              className={`steelflow-card-hover ${tiltClass} rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950`}
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
                    Orientation: {client.orientation ?? "Not set"}
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {linkedOrders} orders
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Weight range
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatMetric(client.min_weight, "kg")} to{" "}
                    {formatMetric(client.max_weight, "kg")}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Max rolls
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {client.max_rolls ?? "Not set"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Dimensions:
                  </span>{" "}
                  {formatMetric(client.max_length, "mm")} x{" "}
                  {formatMetric(client.max_width, "mm")} x{" "}
                  {formatMetric(client.max_height, "mm")}
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Internal diameter:
                  </span>{" "}
                  {formatMetric(client.internal_diameter, "mm")}
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    External diameter:
                  </span>{" "}
                  {formatMetric(client.external_diameter, "mm")}
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Updated:
                  </span>{" "}
                  {formatDate(client.updated_at)}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {filteredClients.length === 0 && (
        <section className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            No clients found
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try another search term to match your client constraints dataset.
          </p>
        </section>
      )}

      <CreateEntityModal
        description="Create a client row that matches the `clients` table columns."
        formId="create-client-form"
        open={isCreateOpen}
        submitLabel="Create client"
        title="New client"
        onClose={handleCloseCreate}
      >
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          id="create-client-form"
          onSubmit={handleCreateClient}
        >
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Name
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
            />
          </label>

          {[
            ["max_weight", "Max weight"],
            ["min_weight", "Min weight"],
            ["max_length", "Max length"],
            ["max_width", "Max width"],
            ["max_height", "Max height"],
            ["max_rolls", "Max rolls"],
            ["internal_diameter", "Internal diameter"],
            ["external_diameter", "External diameter"],
          ].map(([key, label]) => (
            <label className="flex flex-col gap-2 text-sm" key={key}>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {label}
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                step="0.01"
                type="number"
                value={form[key as keyof ClientFormState]}
                onChange={(event) =>
                  handleChange(
                    key as keyof ClientFormState,
                    event.target.value as never
                  )
                }
              />
            </label>
          ))}

          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Orientation
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="vertical or horizontal"
              value={form.orientation}
              onChange={(event) => handleChange("orientation", event.target.value)}
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
