"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateEntityModal } from "@/components/steelflow/CreateEntityModal";
import type { ProductRecord, ProductStatus } from "@/types/product";

type ProductFormState = {
  sku: string;
  name: string;
  category: string;
  material: string;
  dimensions: string;
  unitWeight: string;
  stockStatus: ProductStatus;
  stockUnits: string;
  activeOrders: string;
  location: string;
  pricePerTon: string;
  description: string;
};

const STATUS_STYLES: Record<ProductStatus, string> = {
  active:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  low_stock:
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  draft:
    "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Active",
  low_stock: "Low stock",
  draft: "Draft",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function createFormState(product?: ProductRecord): ProductFormState {
  return {
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    material: product?.material ?? "",
    dimensions: product?.dimensions ?? "",
    unitWeight: product ? String(product.unitWeight) : "",
    stockStatus: product?.stockStatus ?? "draft",
    stockUnits: product ? String(product.stockUnits) : "0",
    activeOrders: product ? String(product.activeOrders) : "0",
    location: product?.location ?? "",
    pricePerTon: product ? String(product.pricePerTon) : "",
    description: product?.description ?? "",
  };
}

function buildProductFromForm(
  form: ProductFormState,
  existing?: ProductRecord
): ProductRecord {
  return {
    id: existing?.id ?? `PRD-${Date.now().toString().slice(-6)}`,
    sku: form.sku.trim(),
    name: form.name.trim(),
    category: form.category.trim(),
    material: form.material.trim(),
    dimensions: form.dimensions.trim(),
    unitWeight: Number(form.unitWeight),
    stockStatus: form.stockStatus,
    stockUnits: Number(form.stockUnits),
    activeOrders: Number(form.activeOrders),
    location: form.location.trim(),
    pricePerTon: Number(form.pricePerTon),
    description: form.description.trim(),
    lastUpdated: new Date().toISOString(),
  };
}

export function ProductsWorkspace({
  initialProducts,
}: {
  initialProducts: ProductRecord[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(
    initialProducts[0]?.id ?? ""
  );
  const [form, setForm] = useState<ProductFormState>(
    createFormState(initialProducts[0])
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(
    createFormState()
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [
        product.id,
        product.sku,
        product.name,
        product.category,
        product.material,
        product.location,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [products, query]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  useEffect(() => {
    if (selectedProduct) {
      setForm(createFormState(selectedProduct));
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!filteredProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(filteredProducts[0]?.id ?? "");
    }
  }, [filteredProducts, selectedProductId]);

  const lowStockCount = products.filter(
    (product) => product.stockStatus === "low_stock"
  ).length;
  const activeProducts = products.filter(
    (product) => product.stockStatus === "active"
  ).length;
  const inventoryUnits = products.reduce(
    (total, product) => total + product.stockUnits,
    0
  );

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
    setCreateForm(createFormState());
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setCreateForm(createFormState());
  }

  function handleStartEdit(product: ProductRecord) {
    setSelectedProductId(product.id);
    setForm(createFormState(product));
  }

  function handleCancel() {
    if (selectedProduct) {
      setForm(createFormState(selectedProduct));
      return;
    }

    setForm(createFormState());
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
    setForm(createFormState(updatedProduct));
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:p-10">
      <section className="steelflow-card-hover steelflow-card-hover--tl rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Products
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Product catalog with create and edit flows
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Mock data rendered as the future product source. This page is ready
              to swap local state for Supabase reads and writes later.
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
            Active catalog
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {activeProducts}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--bl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Low stock
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {lowStockCount}
          </p>
        </div>
        <div className="steelflow-card-hover steelflow-card-hover--br rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Inventory units
          </p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {inventoryUnits}
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
                  Search by SKU, name, category, material, or storage location.
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
              const tiltClass = [
                "steelflow-card-hover--tl",
                "steelflow-card-hover--tr",
                "steelflow-card-hover--bl",
                "steelflow-card-hover--br",
              ][index % 4];
              const selected = selectedProduct?.id === product.id;

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
                          {product.sku}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {product.category} • {product.material}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLES[product.stockStatus]}`}
                      >
                        {STATUS_LABELS[product.stockStatus]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Units
                        </p>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          {product.stockUnits}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Price / ton
                        </p>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                          {formatMoney(product.pricePerTon)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Dimensions:
                        </span>{" "}
                        {product.dimensions}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Location:
                        </span>{" "}
                        {product.location}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Active orders:
                        </span>{" "}
                        {product.activeOrders}
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
                Try another search term or create a new product in the editor.
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
                {form.name || "Edit product"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedProduct
                  ? `Selected ${selectedProduct.id} • Updated ${formatDate(
                      selectedProduct.lastUpdated
                    )}`
                  : "Select a product card to edit it."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  SKU
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.sku}
                  onChange={(event) => handleChange("sku", event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.category}
                  onChange={(event) => handleChange("category", event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Product name
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Material
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.material}
                  onChange={(event) => handleChange("material", event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Dimensions
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.dimensions}
                  onChange={(event) => handleChange("dimensions", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Unit weight (T)
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.unitWeight}
                  onChange={(event) => handleChange("unitWeight", event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Price per ton
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  min="0"
                  step="1"
                  type="number"
                  value={form.pricePerTon}
                  onChange={(event) => handleChange("pricePerTon", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  value={form.stockStatus}
                  onChange={(event) =>
                    handleChange("stockStatus", event.target.value as ProductStatus)
                  }
                >
                  <option value="active">Active</option>
                  <option value="low_stock">Low stock</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Stock units
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  min="0"
                  step="1"
                  type="number"
                  value={form.stockUnits}
                  onChange={(event) => handleChange("stockUnits", event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Active orders
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  min="0"
                  step="1"
                  type="number"
                  value={form.activeOrders}
                  onChange={(event) => handleChange("activeOrders", event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Storage location
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={form.location}
                onChange={(event) => handleChange("location", event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Description
              </span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                required
              />
            </label>

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
        description="Create a product locally with the same record shape we can later persist in Supabase."
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
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              SKU
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.sku}
              onChange={(event) => handleCreateChange("sku", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Category
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.category}
              onChange={(event) =>
                handleCreateChange("category", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Product name
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.name}
              onChange={(event) => handleCreateChange("name", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Material
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.material}
              onChange={(event) =>
                handleCreateChange("material", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Dimensions
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.dimensions}
              onChange={(event) =>
                handleCreateChange("dimensions", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Unit weight (T)
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="0.01"
              type="number"
              value={createForm.unitWeight}
              onChange={(event) =>
                handleCreateChange("unitWeight", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Price per ton
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="1"
              type="number"
              value={createForm.pricePerTon}
              onChange={(event) =>
                handleCreateChange("pricePerTon", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Status
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={createForm.stockStatus}
              onChange={(event) =>
                handleCreateChange(
                  "stockStatus",
                  event.target.value as ProductStatus
                )
              }
            >
              <option value="active">Active</option>
              <option value="low_stock">Low stock</option>
              <option value="draft">Draft</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Stock units
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="1"
              type="number"
              value={createForm.stockUnits}
              onChange={(event) =>
                handleCreateChange("stockUnits", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active orders
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              min="0"
              required
              step="1"
              type="number"
              value={createForm.activeOrders}
              onChange={(event) =>
                handleCreateChange("activeOrders", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Storage location
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.location}
              onChange={(event) =>
                handleCreateChange("location", event.target.value)
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Description
            </span>
            <textarea
              className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              required
              value={createForm.description}
              onChange={(event) =>
                handleCreateChange("description", event.target.value)
              }
            />
          </label>
        </form>
      </CreateEntityModal>
    </main>
  );
}
