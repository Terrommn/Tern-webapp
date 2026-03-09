import { ClientsDirectory } from "@/components/steelflow/ClientsDirectory";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockClients from "@/data/mock-clients.json";
import mockOrders from "@/data/mock-orders.json";
import type { ClientRecord } from "@/types/client";
import type { OrderRecord } from "@/types/order";

export const metadata = {
  title: "Clientes | SteelFlow Pro",
  description: "Gestión de clientes y contactos.",
};

const clients = mockClients as ClientRecord[];
const orders = mockOrders as OrderRecord[];

export default function ClientesPage() {
  return (
    <SteelFlowShell>
      <ClientsDirectory clients={clients} orders={orders} />
    </SteelFlowShell>
  );
}
