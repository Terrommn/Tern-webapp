import { OrdersWorkspace } from "@/components/steelflow/OrdersWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockOrders from "@/data/mock-orders.json";
import type { OrderRecord } from "@/types/order";

export const metadata = {
  title: "Order & Planning | SteelFlow Pro",
  description: "Order queue and planning dashboard with AI-assisted gap analysis.",
};

const orders = mockOrders as OrderRecord[];

export default function OrdenesPage() {
  return (
    <SteelFlowShell>
      <OrdersWorkspace orders={orders} />
    </SteelFlowShell>
  );
}
