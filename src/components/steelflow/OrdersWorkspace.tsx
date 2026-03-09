"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import type { ClientRecord } from "@/types/client";
import type { MaterialRecord } from "@/types/material";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

type OrderFormState = {
  client_id: string;
  product_id: string;
  quantity_kg: string;
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

function createOrderFormState(
  clients: ClientRecord[],
  products: ProductRecord[]
): OrderFormState {
  return {
    client_id: clients[0]?.id ?? "",
    product_id: products[0]?.id ?? "",
    quantity_kg: "",
  };
}

export function OrdersWorkspace({
  initialOrders,
  clients,
  products,
  materials,
}: {
  initialOrders: OrderRecord[];
  clients: ClientRecord[];
  products: ProductRecord[];
  materials: MaterialRecord[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(
    initialOrders[0]?.id ?? ""
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
  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return orders;
    }

    return orders.filter((order) => {
      const client = clientMap.get(order.client_id);
      const product = productMap.get(order.product_id);
      const material = product ? materialMap.get(product.material_id) : undefined;

      return [
        order.id,
        client?.name ?? "",
        material?.name ?? "",
        product ? `${product.gauge}` : "",
        product ? `${product.thickness}` : "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [orders, query, clientMap, productMap, materialMap]);

  useEffect(() => {
    if (!filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id ?? "");
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    filteredOrders[0] ??
    orders[0];

  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity_kg, 0);
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

  function handleCreateOrder(event: React.FormEvent) {
    event.preventDefault();

    const now = new Date().toISOString();
    const newOrder: OrderRecord = {
      id: crypto.randomUUID(),
      client_id: form.client_id,
      product_id: form.product_id,
      quantity_kg: Number(form.quantity_kg),
      created_at: now,
      updated_at: now,
    };

    setOrders((current) => [newOrder, ...current]);
    setSelectedOrderId(newOrder.id);
    setQuery("");
    handleCloseCreate();
  }

  const selectedClient = selectedOrder
    ? clientMap.get(selectedOrder.client_id)
    : undefined;
  const selectedProduct = selectedOrder
    ? productMap.get(selectedOrder.product_id)
    : undefined;
  const selectedMaterial = selectedProduct
    ? materialMap.get(selectedProduct.material_id)
    : undefined;
  const fitsMaxWeight =
    selectedClient?.max_weight === null || selectedClient?.max_weight === undefined
      ? true
      : selectedOrder
        ? selectedOrder.quantity_kg <= selectedClient.max_weight
        : true;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Orders
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Order relationships based on your real schema
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Each order now points to a `client_id` and `product_id`, and the UI
              resolves client rules plus product and material details from those
              linked records.
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
            Total quantity
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {totalQuantity.toLocaleString()}kg
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
                  Search by order UUID, client, material, gauge, or thickness.
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
              const material = product ? materialMap.get(product.material_id) : undefined;
              const tiltClass = [
                "steelflow-card-hover--tl",
                "steelflow-card-hover--tr",
                "steelflow-card-hover--bl",
                "steelflow-card-hover--br",
              ][index % 4];
              const isSelected = selectedOrder?.id === order.id;
              const withinRule =
                client?.max_weight === null || client?.max_weight === undefined
                  ? true
                  : order.quantity_kg <= client.max_weight;

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
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                          {order.id}
                        </p>
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                          {client?.name ?? "Unknown client"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {material?.name ?? "Unknown material"} • Gauge{" "}
                          {product?.gauge ?? "N/A"} • Thickness{" "}
                          {product?.thickness ?? "N/A"} mm
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          withinRule
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                        }`}
                      >
                        {withinRule ? "Within client rule" : "Over max weight"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Quantity
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {order.quantity_kg.toLocaleString()}kg
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
                          Updated
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(order.updated_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Client max
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {client?.max_weight?.toLocaleString() ?? "N/A"}kg
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
                Try another search term across the relational fields.
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
                  {selectedOrder.id}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Linked to {selectedClient?.name ?? "Unknown client"} and{" "}
                  {selectedMaterial?.name ?? "Unknown material"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Quantity
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedOrder.quantity_kg.toLocaleString()}kg
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Product
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedProduct?.gauge ?? "N/A"} / {selectedProduct?.thickness ?? "N/A"}mm
                  </p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Client constraints
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Max weight: {selectedClient?.max_weight ?? "N/A"}kg</p>
                  <p>Min weight: {selectedClient?.min_weight ?? "N/A"}kg</p>
                  <p>Orientation: {selectedClient?.orientation ?? "Not set"}</p>
                  <p>Max rolls: {selectedClient?.max_rolls ?? "Not set"}</p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Product relation
                </h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Material: {selectedMaterial?.name ?? "Unknown"}</p>
                  <p>Gauge: {selectedProduct?.gauge ?? "N/A"}</p>
                  <p>Thickness: {selectedProduct?.thickness ?? "N/A"}mm</p>
                  <p>Product id: {selectedProduct?.id ?? "Unknown"}</p>
                </div>
              </div>

              <div
                className={`rounded-[28px] px-4 py-4 text-sm font-semibold ${
                  fitsMaxWeight
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                }`}
              >
                {fitsMaxWeight
                  ? "This order quantity is within the client's max_weight rule."
                  : "This order quantity exceeds the client's max_weight constraint."}
              </div>
            </div>
          )}
        </aside>
      </section>

      <CreateEntityModal
        description="Create an order row that matches the `orders` table with foreign keys to `clients` and `products`."
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
              {products.map((product) => {
                const material = materialMap.get(product.material_id);
                return (
                  <option key={product.id} value={product.id}>
                    {material?.name ?? "Unknown"} • Gauge {product.gauge} • Thickness{" "}
                    {product.thickness}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Quantity (kg)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="0.01"
              type="number"
              value={form.quantity_kg}
              onChange={(event) => handleChange("quantity_kg", event.target.value)}
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
