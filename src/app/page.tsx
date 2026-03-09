import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";

export default function SteelFlowProDashboardPage() {
  return (
    <SteelFlowShell>
      <main className="mx-auto w-full max-w-[1440px] flex-1 grid grid-cols-1 gap-8 p-6 lg:grid-cols-12 lg:p-10">
        {/* Left Column: Flow Control & Tables */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          {/* Page Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Order Flow Control
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Real-time steel production monitoring and logistics.
            </p>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Daily Flow Bar Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Daily Order Flow
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Metric Tons per Day
                  </p>
                </div>
                <span className="flex items-center text-sm font-bold text-emerald-500">
                  <span className="material-symbols-outlined text-sm">
                    trending_up
                  </span>{" "}
                  +12.5%
                </span>
              </div>
              <div className="flex h-48 items-end justify-between gap-2 pt-4">
                {[
                  { label: "MON", height: "60%" },
                  { label: "TUE", height: "45%" },
                  { label: "WED", height: "80%" },
                  { label: "THU", height: "35%" },
                  { label: "FRI", height: "95%" },
                  { label: "SAT", height: "50%" },
                ].map((bar) => (
                  <div
                    className="group flex flex-1 flex-col items-center gap-2"
                    key={bar.label}
                  >
                    <div
                      className="w-full rounded-t-lg bg-primary/20 transition-colors group-hover:bg-primary"
                      style={{ height: bar.height }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution Donut */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Status Distribution
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Active Pipeline
                  </p>
                </div>
              </div>
              <div className="flex h-48 items-center gap-6">
                <div className="relative size-32">
                  <svg
                    className="size-32 -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      className="stroke-slate-200 dark:stroke-slate-800"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-primary"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray="40 100"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-emerald-500"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray="25 100"
                      strokeDashoffset="-40"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-orange-500"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray="15 100"
                      strokeDashoffset="-65"
                      strokeWidth="4"
                    />
                    <circle
                      className="stroke-slate-400"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray="20 100"
                      strokeDashoffset="-80"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">158</span>
                    <span className="text-[10px] uppercase text-slate-400">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {[
                    { color: "bg-slate-400", label: "Pending", pct: "20%" },
                    { color: "bg-primary", label: "In Prod", pct: "40%" },
                    { color: "bg-orange-500", label: "Packaging", pct: "15%" },
                    { color: "bg-emerald-500", label: "Shipped", pct: "25%" },
                  ].map((item) => (
                    <div
                      className="flex items-center justify-between text-xs"
                      key={item.label}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${item.color}`}
                        />
                        {item.label}
                      </div>
                      <span className="font-bold">{item.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Recent Orders
              </h3>
              <button
                className="text-sm font-semibold text-primary hover:underline"
                type="button"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Weight (T)</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Estimated Ship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      #ST-9920
                    </td>
                    <td className="px-6 py-4">Global Steel Corp</td>
                    <td className="px-6 py-4">Cold Rolled Coil</td>
                    <td className="px-6 py-4">42.5</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                        IN PRODUCTION
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">Oct 12, 2023</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      #ST-9918
                    </td>
                    <td className="px-6 py-4">BuildMore Inc.</td>
                    <td className="px-6 py-4">H-Beams (S275)</td>
                    <td className="px-6 py-4">120.0</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-bold uppercase text-orange-500">
                        Packaging
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">Oct 10, 2023</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      #ST-9915
                    </td>
                    <td className="px-6 py-4">AeroFrame Ltd</td>
                    <td className="px-6 py-4">Galvanized Sheets</td>
                    <td className="px-6 py-4">15.2</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-500">
                        Shipped
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">Oct 08, 2023</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      #ST-9912
                    </td>
                    <td className="px-6 py-4">Metro Rail Dev</td>
                    <td className="px-6 py-4">Reinforcement Bars</td>
                    <td className="px-6 py-4">88.7</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">Oct 15, 2023</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar / Calculator */}
        <aside className="flex flex-col gap-6 lg:col-span-4">
          {/* Pallet Calculator Card */}
          <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-white shadow-lg">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-[160px]">
                calculate
              </span>
            </div>
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">inventory_2</span>
                <h3 className="text-lg font-bold">
                  Calculadora de Empaquetado
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase opacity-80">
                    Tipo de Producto
                  </label>
                  <select className="w-full rounded-lg border-white/20 bg-white/10 py-2 px-3 text-sm focus:border-white focus:ring-white">
                    <option className="bg-slate-900">
                      Steel Coils (Bobinas)
                    </option>
                    <option className="bg-slate-900">
                      Steel Sheets (Láminas)
                    </option>
                    <option className="bg-slate-900">
                      Bars &amp; Rods (Barras)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase opacity-80">
                    Cantidad de Productos
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      className="w-full rounded-lg border-white/20 bg-white/10 py-2 px-3 text-sm focus:ring-white"
                      defaultValue={12}
                      type="number"
                    />
                    <span className="text-sm font-medium">Unidades</span>
                  </div>
                </div>
                <hr className="my-4 border-white/20" />
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                    Dimensiones de Tarima Recomendadas
                  </p>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-80">
                        Largo x Ancho x Alto
                      </span>
                      <span className="font-mono font-bold">
                        1200 x 800 x 950 mm
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-80">
                        Peso Estimado de Carga
                      </span>
                      <span className="font-mono font-bold">
                        1,450.50 kg
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="mt-2 w-full rounded-lg bg-white py-3 font-bold text-primary shadow-md transition-colors hover:bg-slate-100"
                  type="button"
                >
                  Generar Reporte de Empaque
                </button>
              </div>
            </div>
          </div>

          {/* Live Monitoring Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Live Production
              </h3>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: "settings_suggest",
                  zone: "Zone 4 - Rolling Mill",
                  pct: 85,
                  color: "bg-emerald-500",
                  textColor: "text-emerald-500",
                },
                {
                  icon: "precision_manufacturing",
                  zone: "Zone 2 - Cutting",
                  pct: 42,
                  color: "bg-primary",
                  textColor: "text-primary",
                },
                {
                  icon: "package_2",
                  zone: "Zone 6 - Packaging",
                  pct: 15,
                  color: "bg-orange-500",
                  textColor: "text-orange-500",
                },
              ].map((item) => (
                <div className="flex items-center gap-4" key={item.zone}>
                  <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <span className="material-symbols-outlined text-slate-500">
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.zone}
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold ${item.textColor}`}
                  >
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Industrial Support Info */}
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-400">
              help_center
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Industrial Support
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Contact maintenance: Ext 405
              </p>
            </div>
          </div>
        </aside>
      </main>
    </SteelFlowShell>
  );
}
