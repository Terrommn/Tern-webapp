"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useMemo, useState } from "react";
import { useGamificationContext } from "@/components/steelflow/GamificationProvider";
import Link from "next/link";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  calculatePalletLayout,
  calculateMultiProductPalletLayout,
} from "@/lib/pallet-calculator";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

type OrderLine = {
  key: string;
  product_id: string;
  net_weight_ton: string;
};

type OrderFormState = {
  client_id: string;
  lines: OrderLine[];
  plant: string;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "ARM") return "Armada";
  if (status === "CUM") return "CUM";
  if (status === "PEN") return "PEN";
  return status;
}

function statusBadgeClass(status: string) {
  if (status === "CUM") return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
  if (status === "ARM") return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400";
  if (status === "PEN") return "bg-primary/10 text-primary";
  return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
}

function orderKey(order: OrderRecord) {
  return `${order.id}-${order.line_number}`;
}

function firstProductForClient(products: ProductRecord[], client_id: string): string {
  return products.find((p) => p.client_id === client_id)?.id ?? products[0]?.id ?? "";
}

function createDefaultLine(products: ProductRecord[], client_id: string): OrderLine {
  return {
    key: crypto.randomUUID(),
    product_id: firstProductForClient(products, client_id),
    net_weight_ton: "",
  };
}

function createOrderFormState(
  clients: ClientRecord[],
  products: ProductRecord[]
): OrderFormState {
  const client_id = clients[0]?.id ?? "";
  return {
    client_id,
    lines: [createDefaultLine(products, client_id)],
    plant: "",
    status: "PEN",
  };
}

type AppRole = "admin" | "operator" | null;

export function OrdersWorkspace({
  initialOrders,
  clients,
  products,
  role,
}: {
  initialOrders: OrderRecord[];
  clients: ClientRecord[];
  products: ProductRecord[];
  role?: AppRole;
}) {
  const { awardXP } = useGamificationContext();
  const isOperator = role === "operator";
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
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Products available for the currently selected client in the form
  const clientProducts = useMemo(
    () => products.filter((p) => p.client_id === form.client_id),
    [products, form.client_id]
  );

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
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
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders, query, clientMap, productMap]);

  const selectedOrder =
    filteredOrders.find((o) => orderKey(o) === selectedOrderKey) ??
    filteredOrders[0] ??
    orders[0];

  const totalWeight = orders.reduce((s, o) => s + (Number(o.net_weight_ton) || 0), 0);
  const uniqueClients = new Set(orders.map((o) => o.client_id)).size;
  const uniqueProducts = new Set(orders.map((o) => o.product_id)).size;

  // ── Form helpers ──────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setForm(createOrderFormState(clients, products));
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setForm(createOrderFormState(clients, products));
  }

  async function handleMarkCUM(order: OrderRecord) {
    if (order.status !== "ARM") return;
    const supabase = createSupabaseClient();
    await supabase.from("orders").update({ status: "CUM", updated_at: new Date().toISOString() }).eq("id", order.id).eq("line_number", order.line_number);
    setOrders((prev) => prev.map((o) => o.id === order.id && o.line_number === order.line_number ? { ...o, status: "CUM" } : o));
    try {
      await awardXP("order_cumplida", "order", String(order.id), "Orden completada correctamente");
    } catch (e) {
      console.error("Gamification error (order_cumplida):", e);
    }
  }

  function handleClientChange(client_id: string) {
    setForm((f) => ({
      ...f,
      client_id,
      lines: [createDefaultLine(products, client_id)],
    }));
  }

  function handleLineChange(index: number, field: keyof Omit<OrderLine, "key">, value: string) {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  }

  function handleAddLine() {
    setForm((f) => ({
      ...f,
      lines: [...f.lines, createDefaultLine(products, f.client_id)],
    }));
  }

  function handleRemoveLine(index: number) {
    setForm((f) => ({
      ...f,
      lines: f.lines.filter((_, i) => i !== index),
    }));
  }

  // ── Live pallet preview ───────────────────────────────────────────────────

  const formPalletPreview = useMemo(() => {
    const validLines = form.lines
      .map((line, i) => {
        const product = productMap.get(line.product_id);
        const weight = Number(line.net_weight_ton);
        if (!product || !weight || weight <= 0) return null;
        return { product, net_weight_ton: weight, line_index: i };
      })
      .filter((l) => l !== null);

    if (validLines.length === 0) return null;
    return calculateMultiProductPalletLayout(validLines);
  }, [form.lines, productMap]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleCreateOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const orderId = Date.now();
    const now = new Date().toISOString();

    const rows = form.lines.map((line, i) => {
      const product = productMap.get(line.product_id);
      const weight = Number(line.net_weight_ton);
      const layout =
        product && weight > 0 ? calculatePalletLayout(product, weight) : null;
      return {
        id: orderId,
        line_number: i + 1,
        client_id: form.client_id,
        product_id: line.product_id,
        net_weight_ton: weight,
        plant: form.plant,
        status: form.status,
        created_at: now,
        width_mm: layout?.pallet_dimensions.width_mm ?? null,
        length_mm: layout?.pallet_dimensions.length_mm ?? null,
        thickness_mm: product?.thickness ?? null,
      };
    });

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("orders").insert(rows).select();

    let newOrders: OrderRecord[];
    if (error) {
      console.error("Failed to create order:", error.message, error.details, error.hint, error.code);
      newOrders = rows.map((row) => ({
        ...row,
        consignee: "",
        purchase_order: 0,
        gross_weight_ton: row.net_weight_ton,
        ofa_id: 0,
        pallet_id: "",
        pallet_date: null,
        dispatched_at: null,
        updated_at: now,
      } as OrderRecord));
    } else {
      newOrders = data as OrderRecord[];
    }

    setOrders((current) => [...newOrders, ...current]);
    try {
      await awardXP("order_created", "order", newOrders[0]?.id?.toString(), "Orden creada");
    } catch (e) {
      console.error("Gamification error (order_created):", e);
    }
    setSelectedOrderKey(orderKey(newOrders[0]));
    setQuery("");
    handleCloseCreate();
  }

  const selectedClient = selectedOrder ? clientMap.get(selectedOrder.client_id) : undefined;
  const selectedProduct = selectedOrder ? productMap.get(selectedOrder.product_id) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      {/* ── Header ── */}
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Orders
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Order management
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Each order links to a client and one or more products, showing net
              weight, status, plant, and pallet information.
            </p>
          </div>
          {!isOperator && (
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                type="button"
                onClick={handleOpenCreate}
              >
                Create order
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Total orders</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{orders.length}</p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Total weight</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{totalWeight.toFixed(1)}T</p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Unique clients</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{uniqueClients}</p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Unique products</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{uniqueProducts}</p>
        </div>
      </section>

      {/* ── List + Detail ── */}
      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        {/* Order list */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Search orders</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search by order ID, client, product, plant, status, or pallet.
                </p>
              </div>
              <div className="relative min-w-0 lg:w-96">
                <AppIcon
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  name="search"
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  placeholder="Search orders..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {filteredOrders.map((order, index) => {
              const client = clientMap.get(order.client_id);
              const product = productMap.get(order.product_id);
              const tiltClass = ["steelflow-card-hover--tl", "steelflow-card-hover--tr", "steelflow-card-hover--bl", "steelflow-card-hover--br"][index % 4];
              const key = orderKey(order);
              const isSelected = selectedOrder ? orderKey(selectedOrder) === key : false;

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className={[
                    "steelflow-card-hover w-full cursor-pointer rounded-[28px] border bg-white p-6 text-left shadow-sm dark:bg-slate-950",
                    tiltClass,
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 dark:border-primary"
                      : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                  onClick={() => setSelectedOrderKey(key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedOrderKey(key); }}
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/simulador?order=${order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          title="Ver en Simulador 3D"
                        >
                          <AppIcon className="text-sm" name="view_in_ar" />
                          <span className="hidden sm:inline">3D</span>
                        </Link>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusBadgeClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Net weight</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {(Number(order.net_weight_ton) || 0).toFixed(2)}T
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Plant</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{order.plant ?? "N/A"}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Created</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Pallet</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{order.pallet_id || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-lg font-bold text-slate-900 dark:text-white">No orders found</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another search term.</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <aside className="min-w-0">
          {selectedOrder && (
            <div className="steelflow-card-hover steelflow-card-hover--br sticky top-6 flex flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Selected order</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  #{selectedOrder.id} · L{selectedOrder.line_number}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedClient?.name ?? selectedOrder.client_id} · {selectedOrder.plant}
                </p>
              </div>

              <Link
                href={`/simulador?order=${selectedOrder.id}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <AppIcon className="text-lg" name="view_in_ar" />
                Ver en Simulador 3D
              </Link>

              {isOperator && selectedOrder.status === "ARM" && (
                <button
                  type="button"
                  onClick={() => handleMarkCUM(selectedOrder)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  <AppIcon className="text-lg" name="verified" />
                  Marcar como CUM (+75 XP)
                </button>
              )}

              {isOperator && selectedOrder.status === "CUM" && (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <AppIcon className="text-lg" name="check_circle" />
                  Orden completada
                </div>
              )}

              {isOperator && selectedOrder.status === "PEN" && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <AppIcon className="text-lg" name="info" />
                  Visualiza en Simulador para armar
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Net weight</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {(Number(selectedOrder.net_weight_ton) || 0).toFixed(2)}T
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Gross weight</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {(Number(selectedOrder.gross_weight_ton) || 0).toFixed(2)}T
                  </p>
                </div>
              </div>

              <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Order details</p>
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

              {selectedProduct && (
                (() => {
                  const layout = calculatePalletLayout(selectedProduct, selectedOrder.net_weight_ton);
                  return (
                    <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 p-5 dark:border-slate-800">
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Pallet layout
                      </h3>
                      <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <p>Form: <span className="font-semibold">{layout.product_form}</span></p>
                        <p>Orientation: <span className="font-semibold">{layout.orientation}</span></p>
                        <p>Pieces: <span className="font-semibold">{layout.num_pieces}</span></p>
                        <p>Pallets: <span className="font-semibold">{layout.num_pallets}</span></p>
                        <p>Per pallet: <span className="font-semibold">{layout.pieces_per_pallet}</span></p>
                        <p>
                          Pallet size:{" "}
                          <span className="font-semibold">
                            {layout.pallet_dimensions.width_mm} × {layout.pallet_dimensions.length_mm} × {layout.pallet_dimensions.height_mm} mm
                          </span>
                        </p>
                        {layout.packaging_code && (
                          <p>Packaging: <span className="font-semibold">{layout.packaging_code}</span></p>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ── Create modal ── */}
      <CreateEntityModal
        description="Create an order with one or more product lines."
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
          {/* Client */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Client</span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={form.client_id}
              onChange={(e) => handleClientChange(e.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>

          {/* Plant */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Plant</span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              placeholder="e.g. Churubusco"
              value={form.plant}
              onChange={(e) => setForm((f) => ({ ...f, plant: e.target.value }))}
            />
          </label>

          {/* Product lines */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Products
              </span>
              <button
                className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                type="button"
                onClick={handleAddLine}
              >
                + Add product
              </button>
            </div>

            {form.lines.map((line, i) => (
              <div
                key={line.key}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Line {i + 1}
                  </span>
                  {form.lines.length > 1 && (
                    <button
                      className="text-xs font-semibold text-red-400 hover:text-red-600"
                      type="button"
                      onClick={() => handleRemoveLine(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={line.product_id}
                  onChange={(e) => handleLineChange(i, "product_id", e.target.value)}
                >
                  {(clientProducts.length > 0 ? clientProducts : products).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.id} · G{product.gauge} · {product.thickness}mm
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  min="0"
                  placeholder="Net weight (tons)"
                  required
                  step="0.001"
                  type="number"
                  value={line.net_weight_ton}
                  onChange={(e) => handleLineChange(i, "net_weight_ton", e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Pallet preview */}
          {formPalletPreview && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Pallet preview
              </p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-slate-500">Pallets</span>
                <span className="font-semibold">{formPalletPreview.num_pallets}</span>
                <span className="text-slate-500">Total weight</span>
                <span className="font-semibold">{formPalletPreview.total_weight_ton.toFixed(3)} T</span>
              </div>
              {formPalletPreview.pallets.map((pallet) => (
                <div
                  key={pallet.pallet_number}
                  className="mt-3 rounded-xl border border-primary/10 bg-white p-3 dark:bg-slate-900"
                >
                  <p className="text-xs font-bold text-slate-500">
                    Pallet {pallet.pallet_number} · {pallet.orientation} ·{" "}
                    {pallet.dimensions.width_mm} × {pallet.dimensions.length_mm} × {pallet.dimensions.height_mm} mm
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {pallet.lines.map((alloc) => (
                      <li key={`${alloc.line_index}-${alloc.product_id}`} className="text-xs text-slate-600 dark:text-slate-400">
                        Line {alloc.line_index + 1} — {alloc.product_id} · {alloc.num_pieces} pc · {alloc.weight_ton} T
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </form>
      </CreateEntityModal>
    </main>
  );
}
