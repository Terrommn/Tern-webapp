export type OrderRecord = {
  id: string;
  clientName: string;
  partNumber: string;
  receivedAt: string;
  dueDate: string;
  priority: "critical" | "high" | "medium";
  autoMatch: "matched" | "partial" | "missing";
  status: "ready" | "in_review" | "blocked";
  tonnage: number;
  progress: number;
  plant: string;
  accountOwner: string;
  notes: string;
  blockers: string[];
  recommendations: string[];
};
