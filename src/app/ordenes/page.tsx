import { OrdersWorkspace } from "@/components/steelflow/OrdersWorkspace";
import { AuthShell } from "@/components/steelflow/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Order & Planning | SteelFlow Pro",
  description: "Order queue and planning dashboard with AI-assisted gap analysis.",
};

export default async function OrdenesPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const role = (cookieStore.get("sf-role")?.value ?? null) as "admin" | "operator" | null;

  const [ordersRes, clientsRes, productsRes] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("clients").select("*"),
    supabase.from("products").select("*"),
  ]);

  const orders = (ordersRes.data ?? []) as OrderRecord[];
  const clients = (clientsRes.data ?? []) as ClientRecord[];
  const products = (productsRes.data ?? []) as ProductRecord[];

  return (
    <AuthShell>
      <OrdersWorkspace
        clients={clients}
        initialOrders={orders}
        products={products}
        role={role}
      />
    </AuthShell>
  );
}
