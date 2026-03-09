import { ClientsDirectory } from "@/components/steelflow/ClientsDirectory";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockClients from "@/data/mock-clients.json";
import type { ClientRecord } from "@/types/client";

export const metadata = {
  title: "Clientes | SteelFlow Pro",
  description: "Gestión de clientes y contactos.",
};

const clients = mockClients as ClientRecord[];

export default function ClientesPage() {
  return (
    <SteelFlowShell>
      <ClientsDirectory clients={clients} />
    </SteelFlowShell>
  );
}
