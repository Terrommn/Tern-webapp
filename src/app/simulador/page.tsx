import { AuthShell } from "@/components/steelflow/AuthShell";
import { UnitySimulator } from "@/components/steelflow/UnitySimulator";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";

export const metadata = {
  title: "Simulador 3D | SteelFlow Pro",
  description: "Simulador interactivo 3D de tarimas industriales.",
};

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const initialOrderId = params.order ? Number(params.order) : undefined;

  const supabase = await createClient();
  const cookieStore = await cookies();
  const role = (cookieStore.get("sf-role")?.value ?? null) as "admin" | "operator" | null;

  const [{ data: ordersData }, { data: productsData }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("products").select("*"),
  ]);

  return (
    <AuthShell>
      <main className="mx-auto w-full max-w-[1440px] flex-1 p-6 lg:p-10">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Simulador 3D
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Visualizacion interactiva de tarimas industriales.
          </p>
        </div>
        <UnitySimulator
          orders={(ordersData ?? []) as OrderRecord[]}
          products={(productsData ?? []) as ProductRecord[]}
          initialOrderId={initialOrderId}
          role={role}
        />
      </main>
    </AuthShell>
  );
}
