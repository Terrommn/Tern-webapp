import { OrdersWorkspace } from "@/components/steelflow/OrdersWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import { createClient } from "@/lib/supabase/server";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Order & Planning | SteelFlow Pro",
  description: "Order queue and planning dashboard with AI-assisted gap analysis.",
};

export default async function OrdenesPage() {
  const supabase = await createClient();

  const [ordersRes, clientsRes, productsRes] = await Promise.all([
    supabase.from("orders").select("*"),
    supabase.from("clients").select("*"),
    supabase.from("products").select("*"),
  ]);

  const orders = (ordersRes.data ?? []) as OrderRecord[];
  const clients = (clientsRes.data ?? []) as ClientRecord[];
  const products = (productsRes.data ?? []) as ProductRecord[];

  return (
    <SteelFlowShell>
      <OrdersWorkspace
        clients={clients}
        initialOrders={orders}
        products={products}
      />
    </SteelFlowShell>
  );
}
