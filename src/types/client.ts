export type ClientRecord = {
  id: string;
  name: string;
  companyCode: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  status: "active" | "review" | "inactive" | "draft";
  lastActivity: string;
  activeOrders: number;
  lifetimeValue: number;
  accountManager: string;
  tags: string[];
};
