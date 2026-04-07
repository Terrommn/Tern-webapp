"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

type OrderFormState = {
  client_id: string;
  product_id: string;
  net_weight_ton: string;
  plant: string;
  status: string;
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

function orderKey(order: OrderRecord) {
  return `${order.id}-${order.line_number}`;
}

function createOrderFormState(
  clients: ClientRecord[],
  products: ProductRecord[]
): OrderFormState {
  return {
    client_id: clients[0]?.id ?? "",
    product_id: products[0]?.id ?? "",
    net_weight_ton: "",
    plant: "",
    status: "PEN",
  };
}

export function OrdersWorkspace({
  initialOrders,
  clients,
  products,
}: {
  initialOrders: OrderRecord[];
  clients: ClientRecord[];
  products: ProductRecord[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedOrderKey, setSelectedOrderKey] = useState(
    initialOrders[0] ? orderKey(initialOrders[0]) : ""
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<OrderFormState>(
    createOrderFormState(clients, products)
  );

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return orders;
    }

    return orders.filter((order) => {
      const client = clientMap.get(order.client_id);
      const product = productMap.get(order.product_id);

      return [
        String(order.id),
        client?.name ?? "",
        product?.id ?? "",
        order.plant ?? "",
        order.status ?? "",
        order.pallet_id ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [orders, query, clientMap, productMap]);

  useEffect(() => {
    if (!filteredOrders.some((order) => orderKey(order) === selectedOrderKey)) {
      setSelectedOrderKey(filteredOrders[0] ? orderKey(filteredOrders[0]) : "");
    }
  }, [filteredOrders, selectedOrderKey]);

  const selectedOrder =
    filteredOrders.find((order) => orderKey(order) === selectedOrderKey) ??
    filteredOrders[0] ??
    orders[0];

  const totalWeight = orders.reduce((sum, order) => sum + (Number(order.net_weight_ton) || 0), 0);
  const uniqueClients = new Set(orders.map((order) => order.client_id)).size;
  const uniqueProducts = new Set(orders.map((order) => order.product_id)).size;

  function handleOpenCreate() {
    setForm(createOrderFormState(clients, products));
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setForm(createOrderFormState(clients, products));
  }

  function handleChange<K extends keyof OrderFormState>(
    key: K,
    value: OrderFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateOrder(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      client_id: form.client_id,
      product_id: form.product_id,
      net_weight_ton: Number(form.net_weight_ton),
      plant: form.plant,
      status: form.status,
    };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .insert(payload)
      .select()
      .single();

    let newOrder: OrderRecord;
    if (error) {
      console.error("Failed to create order:", error);
      const now = new Date().toISOString();
      newOrder = {
        id: Date.now(),
        line_number: 1001,
        status: form.status,
        client_id: form.client_id,
        consignee: "",
        purchase_order: 0,
        plant: form.plant,
        product_id: form.product_id,
        net_weight_ton: Number(form.net_weight_ton),
        gross_weight_ton: Number(form.net_weight_ton),
        width_mm: 0,
        length_mm: 0,
        thickness_mm: 0,
        ofa_id: 0,
        pallet_id: "",
        pallet_date: null,
        dispatched_at: null,
        created_at: now,
        updated_at: now,
      };
    } else {
      newOrder = data as OrderRecord;
    }

    setOrders((current) => [newOrder, ...current]);
    setSelectedOrderKey(orderKey(newOrder));
    setQuery("");
    handleCloseCreate();
  }

  const selectedClient = selectedOrder
    ? clientMap.get(selectedOrder.client_id)
    : undefined;
  const selectedProduct = selectedOrder
    ? productMap.get(selectedOrder.product_id)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Orders
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Order management linked to your Supabase data
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Each order links to a client and product, showing net weight,
              status, plant, and pallet information from the live database.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              type="button"
              onClick={handleOpenCreate}
            >
              Create order
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
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Total weight
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {totalWeight.toFixed(1)}T
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Unique clients
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {uniqueClients}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Unique products
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {uniqueProducts}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Search orders
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search by order ID, client, product, plant, status, or pallet.
                </p>
              </div>

              <div className="relative min-w-0 lg:w-96">
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {filteredOrders.map((order, index) => {
              const client = clientMap.get(order.client_id);
              const product = productMap.get(order.product_id);
              const tiltClass = [
                "steelflow-card-hover--tl",
                "steelflow-card-hover--tr",
                "steelflow-card-hover--bl",
                "steelflow-card-hover--br",
              ][index % 4];
              const key = orderKey(order);
              const isSelected = selectedOrder ? orderKey(selectedOrder) === key : false;

              return (
                <button
                  key={key}
                  className={[
                    "steelflow-card-hover w-full rounded-[28px] border bg-white p-6 text-left shadow-sm dark:bg-slate-950",
                    tiltClass,
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 dark:border-primary"
                      : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedOrderKey(key)}
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                          Order #{order.id} · Line {order.line_number}
                        </p>
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                          {client?.name ?? order.client_id}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {product?.id ?? "Unknown product"} · G{product?.gauge ?? "N/A"} · {product?.thickness ?? "N/A"}mm
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          order.status === "CUM"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : order.status === "PEN"
                              ? "bg-primary/10 text-primary"
                              : "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Net weight
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {(Number(order.net_weight_ton) || 0).toFixed(2)}T
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Plant
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {order.plant ?? "N/A"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Created
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Pallet
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {order.pallet_id || "N/A"}
                        </p>
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
                Try another search term.
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          {selectedOrder && (
            <div className="steelflow-card-hover steelflow-card-hover--br sticky top-6 flex flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  Selected order
                </p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  #{selectedOrder.id} · L{selectedOrder.line_number}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedClient?.name ?? selectedOrder.client_id} · {selectedOrder.plant}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Net weight
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {(Number(selectedOrder.net_weight_ton) || 0).toFixed(2)}T
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Gross weight
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {(Number(selectedOrder.gross_weight_ton) || 0).toFixed(2)}T
                  </p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Order details
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Status: {selectedOrder.status}</p>
                  <p>Purchase order: {selectedOrder.purchase_order}</p>
                  <p>Consignee: {selectedOrder.consignee}</p>
                  <p>Pallet: {selectedOrder.pallet_id || "N/A"}</p>
                  <p>Dispatched: {formatDate(selectedOrder.dispatched_at)}</p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Product details
                </h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Product: {selectedProduct?.id ?? "Unknown"}</p>
                  <p>Gauge: {selectedProduct?.gauge ?? "N/A"}</p>
                  <p>Thickness: {selectedProduct?.thickness ?? "N/A"}mm</p>
                  <p>Process: {selectedProduct?.process ?? "N/A"}</p>
                  <p>Finish: {selectedProduct?.finish ?? "N/A"}</p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Dimensions
                </h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Width: {selectedOrder.width_mm}mm</p>
                  <p>Length: {selectedOrder.length_mm}mm</p>
                  <p>Thickness: {selectedOrder.thickness_mm}mm</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      <CreateEntityModal
        description="Create an order row linked to a client and product."
        formId="create-order-form"
        open={isCreateOpen}
        submitLabel="Create order"
        title="New order"
        onClose={handleCloseCreate}
      >
        <form
          className="grid grid-cols-1 gap-4"
          id="create-order-form"
          onSubmit={handleCreateOrder}
        >
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Client
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={form.client_id}
              onChange={(event) => handleChange("client_id", event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Product
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={form.product_id}
              onChange={(event) => handleChange("product_id", event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.id} · G{product.gauge} · {product.thickness}mm
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Net weight (tons)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="0.001"
              type="number"
              value={form.net_weight_ton}
              onChange={(event) => handleChange("net_weight_ton", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Plant
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="e.g. Churubusco"
              value={form.plant}
              onChange={(event) => handleChange("plant", event.target.value)}
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
