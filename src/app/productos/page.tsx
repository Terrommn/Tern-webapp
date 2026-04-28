import { ProductsWorkspace } from "@/components/steelflow/ProductsWorkspace";
import { AuthShell } from "@/components/steelflow/AuthShell";
import { createClient } from "@/lib/supabase/server";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Productos | SteelFlow Pro",
  description: "Catálogo de productos con flujos de visualización, creación y edición.",
};

export default async function ProductosPage() {
  const supabase = await createClient();

  const [productsRes, clientsRes, ordersRes] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("clients").select("*"),
    supabase.from("orders").select("*"),
  ]);

  const products = (productsRes.data ?? []) as ProductRecord[];
  const clients = (clientsRes.data ?? []) as ClientRecord[];
  const orders = (ordersRes.data ?? []) as OrderRecord[];

  return (
    <AuthShell>
      <ProductsWorkspace
        initialProducts={products}
        clients={clients}
        orders={orders}
      />
    </AuthShell>
  );
}
