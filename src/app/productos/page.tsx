import { ProductsWorkspace } from "@/components/steelflow/ProductsWorkspace";
import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import mockProducts from "@/data/mock-products.json";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Productos | SteelFlow Pro",
  description: "Catálogo de productos con flujos de visualización, creación y edición.",
};

const products = mockProducts as ProductRecord[];

export default function ProductosPage() {
  return (
    <SteelFlowShell>
      <ProductsWorkspace initialProducts={products} />
    </SteelFlowShell>
  );
}
