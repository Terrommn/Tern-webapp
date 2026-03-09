import { OrdersWorkspace } from "@/components/steelflow/OrdersWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockClients from "@/data/mock-clients.json";
import mockMaterials from "@/data/mock-materials.json";
import mockOrders from "@/data/mock-orders.json";
import mockProducts from "@/data/mock-products.json";
import type { ClientRecord } from "@/types/client";
import type { MaterialRecord } from "@/types/material";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Order & Planning | SteelFlow Pro",
  description: "Order queue and planning dashboard with AI-assisted gap analysis.",
};

const orders = mockOrders as OrderRecord[];
const clients = mockClients as ClientRecord[];
const products = mockProducts as ProductRecord[];
const materials = mockMaterials as MaterialRecord[];

export default function OrdenesPage() {
  return (
    <SteelFlowShell>
      <OrdersWorkspace
        clients={clients}
        initialOrders={orders}
        materials={materials}
        products={products}
      />
    </SteelFlowShell>
  );
}
