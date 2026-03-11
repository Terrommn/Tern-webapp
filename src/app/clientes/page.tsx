import { ClientsDirectory } from "@/components/steelflow/ClientsDirectory";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import { createClient } from "@/lib/supabase/server";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";

export const metadata = {
  title: "Clientes | SteelFlow Pro",
  description: "Gestión de clientes y contactos.",
};

export default async function ClientesPage() {
  const supabase = await createClient();

  const [clientsRes, ordersRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("orders").select("*"),
  ]);

  const clients = (clientsRes.data ?? []) as ClientRecord[];
  const orders = (ordersRes.data ?? []) as OrderRecord[];

  return (
    <SteelFlowShell>
      <ClientsDirectory clients={clients} orders={orders} />
    </SteelFlowShell>
  );
}
