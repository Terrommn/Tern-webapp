"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import type { MaterialRecord } from "@/types/material";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

type ProductFormState = {
  gauge: string;
  thickness: string;
  material_id: string;
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
  materials: MaterialRecord[],
  product?: ProductRecord
): ProductFormState {
  return {
    gauge: product ? String(product.gauge) : "",
    thickness: product ? String(product.thickness) : "",
    material_id: product?.material_id ?? materials[0]?.id ?? "",
  };
}

function buildProductFromForm(
  form: ProductFormState,
  existing?: ProductRecord
): ProductRecord {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    gauge: Number(form.gauge),
    thickness: Number(form.thickness),
    material_id: form.material_id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export function ProductsWorkspace({
  initialProducts,
  materials,
  orders,
}: {
  initialProducts: ProductRecord[];
  materials: MaterialRecord[];
  orders: OrderRecord[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(
    initialProducts[0]?.id ?? ""
  );
  const [form, setForm] = useState<ProductFormState>(
    createFormState(materials, initialProducts[0])
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(
    createFormState(materials)
  );

  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
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
      const material = materialMap.get(product.material_id);
      return [
        product.id,
        material?.name ?? "",
        `${product.gauge}`,
        `${product.thickness}`,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [products, query, materialMap]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  useEffect(() => {
    if (selectedProduct) {
      setForm(createFormState(materials, selectedProduct));
    }
  }, [selectedProduct, materials]);

  useEffect(() => {
    if (!filteredProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(filteredProducts[0]?.id ?? "");
    }
  }, [filteredProducts, selectedProductId]);

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
    setCreateForm(createFormState(materials));
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setCreateForm(createFormState(materials));
  }

  function handleStartEdit(product: ProductRecord) {
    setSelectedProductId(product.id);
    setForm(createFormState(materials, product));
  }

  function handleCancel() {
    if (selectedProduct) {
      setForm(createFormState(materials, selectedProduct));
    }
  }

  function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault();

    const newProduct = buildProductFromForm(createForm);
    setProducts((current) => [newProduct, ...current]);
    setSelectedProductId(newProduct.id);
    setQuery("");
    handleCloseCreate();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const updatedProduct = buildProductFromForm(form, selectedProduct);
    setProducts((current) =>
      current.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
    setSelectedProductId(updatedProduct.id);
    setForm(createFormState(materials, updatedProduct));
  }

  const avgThickness = (
    products.reduce((sum, product) => sum + product.thickness, 0) / products.length
  ).toFixed(2);
  const uniqueMaterials = new Set(products.map((product) => product.material_id)).size;
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
              Product definitions aligned to the `products` table
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Products now store only `gauge`, `thickness`, and `material_id`,
              while display names and usage summaries are resolved from related
              materials and orders.
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
            Materials in use
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {uniqueMaterials}
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
                  Search by UUID, material, gauge, or thickness.
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  search
                </span>
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
              const material = materialMap.get(product.material_id);
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
                          {material?.name ?? "Unknown material"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Gauge {product.gauge} • Thickness {product.thickness}mm
                        </p>
                      </div>

                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                        {linked} orders
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Gauge
                        </p>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          {product.gauge}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Thickness
                        </p>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          {product.thickness}mm
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Material id:
                        </span>{" "}
                        {product.material_id}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Created:
                        </span>{" "}
                        {formatDate(product.created_at)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Updated:
                        </span>{" "}
                        {formatDate(product.updated_at)}
                      </p>
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
                {selectedProduct ? "Product row" : "Edit product"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedProduct
                  ? `Selected ${selectedProduct.id} • Updated ${formatDate(
                      selectedProduct.updated_at
                    )}`
                  : "Select a product card to edit it."}
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Material
              </span>
              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={form.material_id}
                onChange={(event) => handleChange("material_id", event.target.value)}
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
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
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={form.gauge}
                  onChange={(event) => handleChange("gauge", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Thickness
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
        description="Create a product row that matches the `products` schema with `gauge`, `thickness`, and `material_id`."
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
              Material
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={createForm.material_id}
              onChange={(event) =>
                handleCreateChange("material_id", event.target.value)
              }
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
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
              min="0"
              required
              step="0.01"
              type="number"
              value={createForm.gauge}
              onChange={(event) => handleCreateChange("gauge", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Thickness
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="0.01"
              type="number"
              value={createForm.thickness}
              onChange={(event) =>
                handleCreateChange("thickness", event.target.value)
              }
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
