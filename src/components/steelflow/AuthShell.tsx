import { cookies } from "next/headers";
import { SteelFlowShell } from "./SteelFlowShell";

type AppRole = "admin" | "operator";

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = (cookieStore.get("sf-role")?.value ?? null) as AppRole | null;
  return <SteelFlowShell role={role}>{children}</SteelFlowShell>;
}
