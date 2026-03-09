export type ProductStatus = "active" | "low_stock" | "draft";

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  material: string;
  dimensions: string;
  unitWeight: number;
  stockStatus: ProductStatus;
  stockUnits: number;
  activeOrders: number;
  location: string;
  pricePerTon: number;
  description: string;
  lastUpdated: string;
};
