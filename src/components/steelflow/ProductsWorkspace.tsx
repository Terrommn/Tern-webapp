"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

type ProductFormState = {
  gauge: string;
  thickness: string;
  client_id: string;
  orientation: string;
  process: string;
  finish: string;
  form: string;
  width: string;
  min_weight: string;
  max_weight: string;
  internal_diameter: string;
  external_diameter: string;
  part_number: string;
  packaging_code: string;
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

function createFormState(
  clients: ClientRecord[],
  product?: ProductRecord
): ProductFormState {
  return {
    gauge: product ? String(product.gauge) : "",
    thickness: product ? String(product.thickness) : "",
    client_id: product?.client_id ?? clients[0]?.id ?? "",
    orientation: product?.orientation ?? "",
    process: product?.process ?? "",
    finish: product?.finish ?? "",
    form: product?.form ?? "",
    width: product?.width != null ? String(product.width) : "",
    min_weight: product?.min_weight != null ? String(product.min_weight) : "",
    max_weight: product?.max_weight != null ? String(product.max_weight) : "",
    internal_diameter: product?.internal_diameter != null ? String(product.internal_diameter) : "",
    external_diameter: product?.external_diameter != null ? String(product.external_diameter) : "",
    part_number: product?.part_number ?? "",
    packaging_code: product?.packaging_code ?? "",
  };
}

export function ProductsWorkspace({
  initialProducts,
  clients,
  orders,
}: {
  initialProducts: ProductRecord[];
  clients: ClientRecord[];
  orders: OrderRecord[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(
    initialProducts[0]?.id ?? ""
  );
  const [form, setForm] = useState<ProductFormState>(
    createFormState(clients, initialProducts[0])
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(
    createFormState(clients)
  );

  const orderCountByProduct = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.product_id] = (acc[order.product_id] ?? 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return [
        product.id,
        `${product.gauge}`,
        `${product.thickness}`,
        product.process ?? "",
        product.finish ?? "",
        product.part_number ?? "",
        product.client_id ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [products, query]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  function handleChange<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreateChange<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleStartCreate() {
    setCreateForm(createFormState(clients));
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setCreateForm(createFormState(clients));
  }

  function handleStartEdit(product: ProductRecord) {
    setSelectedProductId(product.id);
    setForm(createFormState(clients, product));
  }

  function handleCancel() {
    if (selectedProduct) {
      setForm(createFormState(clients, selectedProduct));
    }
  }

  async function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      gauge: createForm.gauge,
      thickness: Number(createForm.thickness),
      client_id: createForm.client_id,
      orientation: createForm.orientation || null,
      process: createForm.process || null,
      finish: createForm.finish || null,
      form: createForm.form || null,
      width: createForm.width ? Number(createForm.width) : null,
      min_weight: createForm.min_weight ? Number(createForm.min_weight) : null,
      max_weight: createForm.max_weight ? Number(createForm.max_weight) : null,
      internal_diameter: createForm.internal_diameter ? Number(createForm.internal_diameter) : null,
      external_diameter: createForm.external_diameter ? Number(createForm.external_diameter) : null,
      part_number: createForm.part_number || null,
      packaging_code: createForm.packaging_code || null,
    };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    let newProduct: ProductRecord;
    if (error) {
      console.error("Failed to create product:", error);
      const now = new Date().toISOString();
      newProduct = {
        id: crypto.randomUUID(),
        ...payload,
        oiling: null,
        flatness: null,
        consignee: null,
        grade_pn: null,
        width_pn: null,
        pieces_per_package: null,
        shipping_packaging: null,
        max_pallet_width: null,
        max_pallet_height: null,
        min_lot: null,
        created_at: now,
        updated_at: now,
      };
    } else {
      newProduct = data as ProductRecord;
    }

    setProducts((current) => [newProduct, ...current]);
    // Gamification: award XP for product creation
    // awardXP(supabase, userId, 'product_created', 30, 'product', newProduct.id)
    setSelectedProductId(newProduct.id);
    setForm(createFormState(clients, newProduct));
    setQuery("");
    handleCloseCreate();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const payload = {
      gauge: form.gauge,
      thickness: Number(form.thickness),
      client_id: form.client_id,
      orientation: form.orientation || null,
      process: form.process || null,
      finish: form.finish || null,
      form: form.form || null,
      width: form.width ? Number(form.width) : null,
      min_weight: form.min_weight ? Number(form.min_weight) : null,
      max_weight: form.max_weight ? Number(form.max_weight) : null,
      internal_diameter: form.internal_diameter ? Number(form.internal_diameter) : null,
      external_diameter: form.external_diameter ? Number(form.external_diameter) : null,
      part_number: form.part_number || null,
      packaging_code: form.packaging_code || null,
    };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", selectedProduct.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update product:", error);
    }

    const updatedProduct = error
      ? { ...selectedProduct, ...payload, updated_at: new Date().toISOString() }
      : (data as ProductRecord);
    // Gamification: award XP for product update
    // awardXP(supabase, userId, 'product_updated', 20, 'product', updatedProduct.id)

    setProducts((current) =>
      current.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
    setSelectedProductId(updatedProduct.id);
    setForm(createFormState(clients, updatedProduct));
  }

  const avgThickness = products.length
    ? (products.reduce((sum, product) => sum + product.thickness, 0) / products.length).toFixed(2)
    : "0";
  const uniqueClients = new Set(products.map((p) => p.client_id)).size;
  const linkedOrders = orders.length;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Products
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Product catalog with specifications
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Products store gauge, thickness, weight constraints, dimensions,
              and packaging details from the live Supabase database.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              type="button"
              onClick={handleStartCreate}
            >
              New product
            </button>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              type="button"
              onClick={() => selectedProduct && handleStartEdit(selectedProduct)}
            >
              Edit selected
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="steelflow-card-hover steelflow-card-hover--tl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Total products
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {products.length}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Linked clients
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {uniqueClients}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Avg thickness
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {avgThickness}mm
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Linked orders
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {linkedOrders}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Mastery</p>
          <p className="mt-3 text-sm font-bold text-primary">Product Specialist — Tier 1</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_460px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="steelflow-card-hover steelflow-card-hover--tr rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Browse products
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search by ID, gauge, thickness, process, finish, or part number.
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <AppIcon
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  name="search"
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  placeholder="Search products..."
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {filteredProducts.map((product, index) => {
              const tiltClass = [
                "steelflow-card-hover--tl",
                "steelflow-card-hover--tr",
                "steelflow-card-hover--bl",
                "steelflow-card-hover--br",
              ][index % 4];
              const selected = selectedProduct?.id === product.id;
              const linked = orderCountByProduct[product.id] ?? 0;

              return (
                <button
                  key={product.id}
                  className={[
                    "steelflow-card-hover rounded-[28px] border bg-white p-6 text-left shadow-sm dark:bg-slate-950",
                    tiltClass,
                    selected
                      ? "border-primary ring-2 ring-primary/20 dark:border-primary"
                      : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                  type="button"
                  onClick={() => handleStartEdit(product)}
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                          {product.id}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          G{product.gauge} · {product.thickness}mm
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {product.process ?? "N/A"} · {product.finish ?? "N/A"} · {product.form ?? "N/A"}
                        </p>
                      </div>

                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                        {linked} orders
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Weight range
                        </p>
                        <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                          {product.min_weight ?? "—"} – {product.max_weight ?? "—"}T
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Width
                        </p>
                        <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                          {product.width ?? "N/A"}mm
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                No products found
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try another search term or create a new product.
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <form
            className="steelflow-card-hover steelflow-card-hover--br sticky top-6 flex flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Edit
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {selectedProduct ? "Product details" : "Edit product"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedProduct
                  ? `Selected ${selectedProduct.id} · Updated ${formatDate(selectedProduct.updated_at)}`
                  : "Select a product card to edit it."}
              </p>
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Gauge
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                  value={form.gauge}
                  onChange={(event) => handleChange("gauge", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Thickness (mm)
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={form.thickness}
                  onChange={(event) => handleChange("thickness", event.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Process
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.process}
                  onChange={(event) => handleChange("process", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Finish
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.finish}
                  onChange={(event) => handleChange("finish", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Form
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.form}
                  onChange={(event) => handleChange("form", event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                type="submit"
              >
                Save changes
              </button>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                type="button"
                onClick={handleCancel}
              >
                Reset form
              </button>
            </div>
          </form>
        </aside>
      </section>

      <CreateEntityModal
        description="Create a product with gauge, thickness, weight constraints, and packaging details."
        formId="create-product-form"
        open={isCreateOpen}
        submitLabel="Create product"
        title="New product"
        onClose={handleCloseCreate}
      >
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          id="create-product-form"
          onSubmit={handleCreateProduct}
        >
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Client
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={createForm.client_id}
              onChange={(event) => handleCreateChange("client_id", event.target.value)}
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
              Gauge
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.gauge}
              onChange={(event) => handleCreateChange("gauge", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Thickness (mm)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="0.01"
              type="number"
              value={createForm.thickness}
              onChange={(event) => handleCreateChange("thickness", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Min weight (T)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              step="0.01"
              type="number"
              value={createForm.min_weight}
              onChange={(event) => handleCreateChange("min_weight", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Max weight (T)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              step="0.01"
              type="number"
              value={createForm.max_weight}
              onChange={(event) => handleCreateChange("max_weight", event.target.value)}
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
