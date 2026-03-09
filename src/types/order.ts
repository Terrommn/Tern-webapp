export type OrderRecord = {
  id: string;
  client_id: string;
  product_id: string;
  quantity_kg: number;
  created_at: string | null;
  updated_at: string | null;
};
