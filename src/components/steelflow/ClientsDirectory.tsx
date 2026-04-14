"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";

type ClientFormState = {
  name: string;
  transport_type: string;
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

function createClientFormState(): ClientFormState {
  return {
    name: "",
    transport_type: "CAMION",
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

  const weightByClient = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.client_id] = (acc[order.client_id] ?? 0) + (Number(order.net_weight_ton) || 0);
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
      [client.id, client.name, client.transport_type ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [clients, query]);

  const totalOrders = orders.length;
  const transportTypes = new Set(clients.map((c) => c.transport_type).filter(Boolean)).size;
  const totalWeight = orders.reduce((sum, o) => sum + (Number(o.net_weight_ton) || 0), 0);

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

  async function handleCreateClient(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      transport_type: form.transport_type.trim() || null,
    };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Failed to create client:", error);
      const now = new Date().toISOString();
      const fallback: ClientRecord = {
        id: form.name.trim(),
        ...payload,
        transport_type: payload.transport_type,
        created_at: now,
        updated_at: now,
      };
      setClients((current) => [fallback, ...current]);
    } else {
      setClients((current) => [data as ClientRecord, ...current]);
    }

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
            Client directory with transport and order data
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Clients linked to their orders and transport type from the live
            Supabase database.
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
              Total weight
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {totalWeight.toFixed(1)}T
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Transport types
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {transportTypes}
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
              Search clients
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by ID, name, or transport type.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-96">
              <AppIcon
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                name="search"
              />
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
          const clientWeight = weightByClient[client.id] ?? 0;

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
                    Transport: {client.transport_type ?? "Not set"}
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {linkedOrders} orders
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Total weight
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {clientWeight.toFixed(2)}T
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Transport
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {client.transport_type ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400">
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
            Try another search term.
          </p>
        </section>
      )}

      <CreateEntityModal
        description="Create a client row in the clients table."
        formId="create-client-form"
        open={isCreateOpen}
        submitLabel="Create client"
        title="New client"
        onClose={handleCloseCreate}
      >
        <form
          className="grid grid-cols-1 gap-4"
          id="create-client-form"
          onSubmit={handleCreateClient}
        >
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Name / ID
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Transport type
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={form.transport_type}
              onChange={(event) => handleChange("transport_type", event.target.value)}
            >
              <option value="CAMION">CAMION</option>
              <option value="TREN">TREN</option>
              <option value="BARCO">BARCO</option>
            </select>
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
