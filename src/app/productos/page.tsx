import { ProductsWorkspace } from "@/components/steelflow/ProductsWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import { createClient } from "@/lib/supabase/server";
import type { MaterialRecord } from "@/types/material";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Productos | SteelFlow Pro",
  description: "Catálogo de productos con flujos de visualización, creación y edición.",
};

export default async function ProductosPage() {
  const supabase = await createClient();

  const [productsRes, materialsRes, ordersRes] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("materials").select("*"),
    supabase.from("orders").select("*"),
  ]);

  const products = (productsRes.data ?? []) as ProductRecord[];
  const materials = (materialsRes.data ?? []) as MaterialRecord[];
  const orders = (ordersRes.data ?? []) as OrderRecord[];

  return (
    <SteelFlowShell>
      <ProductsWorkspace
        initialProducts={products}
        materials={materials}
        orders={orders}
      />
    </SteelFlowShell>
  );
}
