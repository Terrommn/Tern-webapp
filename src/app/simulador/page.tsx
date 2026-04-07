import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import { UnitySimulator } from "@/components/steelflow/UnitySimulator";

export const metadata = {
  title: "Simulador 3D | SteelFlow Pro",
  description: "Simulador interactivo 3D de componentes industriales.",
};

export default function SimuladorPage() {
  return (
    <SteelFlowShell>
      <main className="mx-auto w-full max-w-[1440px] flex-1 p-6 lg:p-10">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Simulador 3D
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Visualizacion interactiva de componentes industriales.
          </p>
        </div>
        <UnitySimulator />
      </main>
    </SteelFlowShell>
  );
}
