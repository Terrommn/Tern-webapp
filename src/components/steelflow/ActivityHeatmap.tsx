"use client";

type HeatmapDataPoint = {
  date: string;
  level: number;
  orders: number;
  tonnage: number;
};

type ActivityHeatmapProps = {
  data: HeatmapDataPoint[];
};

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const LEVEL_COLORS = [
  "rgb(30 41 59)", // 0 - slate-800
  "rgb(212 17 17 / 0.2)", // 1
  "rgb(212 17 17 / 0.4)", // 2
  "rgb(212 17 17 / 0.7)", // 3
  "rgb(212 17 17 / 1)", // 4
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // getDay(): 0=Sun,1=Mon...6=Sat -> offset to Monday
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a map of 52 weeks x 7 days, ending at today.
 */
function buildGrid(data: HeatmapDataPoint[]) {
  const lookup = new Map<string, HeatmapDataPoint>();
  for (const d of data) {
    lookup.set(d.date, d);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Monday 51 weeks ago
  const startMonday = getMonday(today);
  startMonday.setDate(startMonday.getDate() - 51 * 7);

  const weeks: {
    cells: {
      date: string;
      level: number;
      orders: number;
      tonnage: number;
      inFuture: boolean;
    }[];
    monthLabel: string | null;
  }[] = [];

  const current = new Date(startMonday);

  for (let w = 0; w < 52; w++) {
    const cells: {
      date: string;
      level: number;
      orders: number;
      tonnage: number;
      inFuture: boolean;
    }[] = [];

    // Determine if this week starts a new month for the label
    let monthLabel: string | null = null;
    const firstDayOfWeek = new Date(current);
    if (firstDayOfWeek.getDate() <= 7) {
      monthLabel = firstDayOfWeek.toLocaleDateString("es-MX", {
        month: "short",
      });
    }

    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(current);
      const inFuture = current > today;
      const point = lookup.get(dateStr);
      cells.push({
        date: dateStr,
        level: inFuture ? -1 : (point?.level ?? 0),
        orders: point?.orders ?? 0,
        tonnage: point?.tonnage ?? 0,
        inFuture,
      });
      current.setDate(current.getDate() + 1);
    }

    weeks.push({ cells, monthLabel });
  }

  return weeks;
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = buildGrid(data);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
        Actividad
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0">
          {/* Month labels row */}
          <div className="mb-1 flex" style={{ paddingLeft: 20 }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="text-[9px] text-slate-400"
                style={{ width: 14 }}
              >
                {week.monthLabel ?? ""}
              </div>
            ))}
          </div>

          {/* Grid rows (one per day of week) */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayIdx} className="flex items-center">
              {/* Day label */}
              <div
                className="shrink-0 text-[9px] text-slate-400"
                style={{ width: 20 }}
              >
                {dayIdx % 2 === 0 ? dayLabel : ""}
              </div>

              {/* Cells for each week */}
              {weeks.map((week, wi) => {
                const cell = week.cells[dayIdx];
                const bg =
                  cell.inFuture || cell.level < 0
                    ? "transparent"
                    : LEVEL_COLORS[cell.level] ?? LEVEL_COLORS[0];

                const tooltip = cell.inFuture
                  ? ""
                  : `${cell.date}: ${cell.orders} ordenes, ${Math.round(cell.tonnage)}t`;

                return (
                  <div
                    key={wi}
                    title={tooltip}
                    className="rounded-[2px]"
                    style={{
                      width: 11,
                      height: 11,
                      margin: 1.5,
                      backgroundColor: bg,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[9px] text-slate-400">
        <span>Menos</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className="rounded-[2px]"
            style={{
              width: 11,
              height: 11,
              backgroundColor: color,
            }}
          />
        ))}
        <span>Mas</span>
      </div>
    </div>
  );
}
