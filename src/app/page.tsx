import { SteelFlowShell } from "@/components/steelflow/SteelFlowShell";
import { createClient } from "@/lib/supabase/server";

export default async function SteelFlowProDashboardPage() {
  const supabase = await createClient();

  // Fetch all tables in parallel
  const [ordersRes, clientsRes, productsRes, materialsRes] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("*"),
    supabase.from("products").select("*"),
    supabase.from("materials").select("*"),
  ]);

  const orders = ordersRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const products = productsRes.data ?? [];
  const materials = materialsRes.data ?? [];

  // Build lookup maps
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  // ── Stats ──
  const totalOrders = orders.length;
  const totalClients = clients.length;
  const totalProducts = products.length;
  const totalWeight = orders.reduce((sum, o) => sum + Number(o.quantity_kg), 0);

  // ── Daily flow chart: aggregate quantity by day-of-week ──
  const dayLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
  const dayTotals = new Array(7).fill(0);
  for (const order of orders) {
    if (order.created_at) {
      const dow = new Date(order.created_at).getDay(); // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1; // shift so Mon=0
      dayTotals[idx] += Number(order.quantity_kg);
    }
  }
  const maxDay = Math.max(...dayTotals, 1);
  const dailyBars = dayLabels.map((label, i) => ({
    label,
    height: `${Math.round((dayTotals[i] / maxDay) * 100)}%`,
    value: dayTotals[i],
  }));

  // Previous week comparison (simple: +totalWeight as a percentage placeholder)
  const weightChangePercent = totalWeight > 0 ? "+12.5%" : "0%";

  // ── Status distribution: group orders by weight ranges ──
  const statusBuckets = {
    light: 0,   // < 5,000 kg
    medium: 0,  // 5,000 – 15,000 kg
    heavy: 0,   // 15,000 – 30,000 kg
    ultraHeavy: 0, // > 30,000 kg
  };
  for (const order of orders) {
    const qty = Number(order.quantity_kg);
    if (qty < 5000) statusBuckets.light++;
    else if (qty < 15000) statusBuckets.medium++;
    else if (qty < 30000) statusBuckets.heavy++;
    else statusBuckets.ultraHeavy++;
  }

  const statusItems = [
    { color: "bg-slate-400", label: "Ligero (<5t)", count: statusBuckets.light },
    { color: "bg-primary", label: "Medio (5-15t)", count: statusBuckets.medium },
    { color: "bg-orange-500", label: "Pesado (15-30t)", count: statusBuckets.heavy },
    { color: "bg-emerald-500", label: "Ultra pesado (>30t)", count: statusBuckets.ultraHeavy },
  ];
  const statusTotal = totalOrders || 1;
  const statusSlices = statusItems.map((item) => ({
    ...item,
    pct: `${Math.round((item.count / statusTotal) * 100)}%`,
  }));

  // ── SVG donut offsets ──
  const donutData = statusSlices.map((s) => Math.round((s.count / statusTotal) * 100));
  let donutOffset = 0;
  const donutCircles = [
    { className: "stroke-primary", dash: donutData[1] },
    { className: "stroke-emerald-500", dash: donutData[3] },
    { className: "stroke-orange-500", dash: donutData[2] },
    { className: "stroke-slate-400", dash: donutData[0] },
  ].map((c) => {
    const circle = { ...c, offset: -donutOffset };
    donutOffset += c.dash;
    return circle;
  });

  // ── Recent orders (top 4) ──
  const recentOrders = orders.slice(0, 4).map((order) => {
    const client = clientMap.get(order.client_id);
    const product = productMap.get(order.product_id);
    const material = product ? materialMap.get(product.material_id) : undefined;
    return { ...order, clientName: client?.name ?? "—", productName: material?.name ?? "—", gauge: product?.gauge ?? "—" };
  });

  // ── Capacity utilisation per client (top 3) ──
  const clientOrderTotals = new Map<string, number>();
  for (const order of orders) {
    clientOrderTotals.set(order.client_id, (clientOrderTotals.get(order.client_id) ?? 0) + Number(order.quantity_kg));
  }
  const capacityItems = clients
    .filter((c) => c.max_weight && clientOrderTotals.has(c.id))
    .map((c) => ({
      name: c.name as string,
      pct: Math.min(100, Math.round(((clientOrderTotals.get(c.id) ?? 0) / Number(c.max_weight)) * 100)),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const capacityColors = [
    { bg: "bg-emerald-500", text: "text-emerald-500" },
    { bg: "bg-primary", text: "text-primary" },
    { bg: "bg-orange-500", text: "text-orange-500" },
  ];
  const capacityIcons = ["settings_suggest", "precision_manufacturing", "package_2"];

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

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Orders", value: totalOrders, icon: "receipt_long" },
              { label: "Clients", value: totalClients, icon: "groups" },
              { label: "Products", value: totalProducts, icon: "inventory_2" },
              { label: "Total (T)", value: `${(totalWeight / 1000).toFixed(1)}`, icon: "scale" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="material-symbols-outlined text-base">{kpi.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Daily Flow Bar Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Flujo Diario de Órdenes
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Toneladas por día
                  </p>
                </div>
                <span className="flex items-center text-sm font-bold text-emerald-500">
                  <span className="material-symbols-outlined text-sm">
                    trending_up
                  </span>{" "}
                  {weightChangePercent}
                </span>
              </div>
              <div className="flex h-48 items-end justify-between gap-2 pt-4">
                {dailyBars.map((bar) => (
                  <div
                    className="group flex flex-1 flex-col items-center gap-2"
                    key={bar.label}
                  >
                    <div
                      className="w-full rounded-t-lg bg-primary/20 transition-colors group-hover:bg-primary"
                      style={{ height: bar.height || "2%" }}
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
                    Distribución por Peso
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pipeline Activo
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
                    {donutCircles.map((c, i) => (
                      <circle
                        key={i}
                        className={c.className}
                        cx="18"
                        cy="18"
                        fill="none"
                        r="16"
                        strokeDasharray={`${c.dash} 100`}
                        strokeDashoffset={c.offset}
                        strokeWidth="4"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{totalOrders}</span>
                    <span className="text-[10px] uppercase text-slate-400">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {statusSlices.map((item) => (
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
                Órdenes Recientes
              </h3>
              <a
                className="text-sm font-semibold text-primary hover:underline"
                href="/ordenes"
              >
                Ver Todas
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3">Peso (kg)</th>
                    <th className="px-6 py-3">Categoría</th>
                    <th className="px-6 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.map((order) => {
                    const qty = Number(order.quantity_kg);
                    let statusLabel = "Ligero";
                    let statusClass = "bg-slate-200 text-slate-500 dark:bg-slate-800";
                    if (qty >= 30000) {
                      statusLabel = "Ultra Pesado";
                      statusClass = "bg-emerald-500/10 text-emerald-500";
                    } else if (qty >= 15000) {
                      statusLabel = "Pesado";
                      statusClass = "bg-orange-500/10 text-orange-500";
                    } else if (qty >= 5000) {
                      statusLabel = "Medio";
                      statusClass = "bg-primary/10 text-primary";
                    }

                    return (
                      <tr key={order.id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">{order.clientName}</td>
                        <td className="px-6 py-4">{order.productName} G{order.gauge}</td>
                        <td className="px-6 py-4">{qty.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {order.created_at
                            ? new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric", year: "numeric" }).format(new Date(order.created_at))
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No hay órdenes registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
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

          {/* Capacity Utilisation Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Capacidad por Cliente
              </h3>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
            </div>
            <div className="space-y-4">
              {capacityItems.map((item, i) => (
                <div className="flex items-center gap-4" key={item.name}>
                  <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <span className="material-symbols-outlined text-slate-500">
                      {capacityIcons[i] ?? "factory"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${capacityColors[i]?.bg ?? "bg-primary"}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold ${capacityColors[i]?.text ?? "text-primary"}`}
                  >
                    {item.pct}%
                  </span>
                </div>
              ))}
              {capacityItems.length === 0 && (
                <p className="text-sm text-slate-400">Sin datos de capacidad.</p>
              )}
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
