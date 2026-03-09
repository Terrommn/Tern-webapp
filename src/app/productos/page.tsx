import { ProductsWorkspace } from "@/components/steelflow/ProductsWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockMaterials from "@/data/mock-materials.json";
import mockOrders from "@/data/mock-orders.json";
import mockProducts from "@/data/mock-products.json";
import type { MaterialRecord } from "@/types/material";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Productos | SteelFlow Pro",
  description: "Catálogo de productos con flujos de visualización, creación y edición.",
};

const products = mockProducts as ProductRecord[];
const materials = mockMaterials as MaterialRecord[];
const orders = mockOrders as OrderRecord[];

export default function ProductosPage() {
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
