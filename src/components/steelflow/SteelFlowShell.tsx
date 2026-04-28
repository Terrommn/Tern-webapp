"use client";

import { AppIcon } from "@/components/ui/app-icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "admin" | "operator";

const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "space_dashboard", roles: ["admin"] as AppRole[] },
  { href: "/clientes", label: "Clients", icon: "groups", roles: ["admin"] as AppRole[] },
  { href: "/ordenes", label: "Orders", icon: "receipt_long", roles: ["admin", "operator"] as AppRole[] },
  { href: "/productos", label: "Products", icon: "inventory_2", roles: ["admin"] as AppRole[] },
  { href: "/simulador", label: "Simulador", icon: "view_in_ar", roles: ["admin", "operator"] as AppRole[] },
  { href: "/progreso", label: "Mi Progreso", icon: "emoji_events", roles: ["operator"] as AppRole[] },
  { href: "/desafios", label: "Desafíos", icon: "local_fire_department", roles: ["operator"] as AppRole[] },
  { href: "/misiones", label: "Misiones", icon: "military_tech", roles: ["operator"] as AppRole[] },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

interface SteelFlowShellProps {
  children: React.ReactNode;
  role: AppRole | null;
}

export function SteelFlowShell({ children, role }: SteelFlowShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role)
  );

  const currentSection =
    navItems.find(({ href }) => isActivePath(pathname, href))?.label ?? "SteelFlow";

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel = role === "admin" ? "Administrador" : role === "operator" ? "Operador" : "";
  const roleBadgeColor = role === "admin" ? "text-[#d41111] bg-[#d41111]/10 ring-[#d41111]/20" : "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20";

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {mobileOpen && (
        <button
          aria-label="Cerrar sidebar"
          className="fixed inset-0 z-30 bg-slate-950/60 md:hidden"
          type="button"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 -translate-x-full flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/95 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "",
          isCollapsed ? "md:w-24" : "md:w-72",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-5 dark:border-slate-800">
          <Link
            className={[
              "flex min-w-0 items-center gap-3 text-primary transition-all",
              isCollapsed ? "md:justify-center" : "",
            ].join(" ")}
            href={role === "operator" ? "/ordenes" : "/"}
            onClick={() => setMobileOpen(false)}
          >
            <AppIcon className="text-3xl" name="precision_manufacturing" />
            <div className={isCollapsed ? "hidden md:hidden" : "min-w-0"}>
              <p className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">
                SteelFlow
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Pro
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:flex"
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
            >
              <AppIcon
                className="text-xl"
                name={isCollapsed ? "chevron_right" : "chevron_left"}
              />
            </button>
            <button
              aria-label="Cerrar menú"
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
              type="button"
              onClick={() => setMobileOpen(false)}
            >
              <AppIcon className="text-xl" name="close" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-3 py-4">
          {/* Role badge */}
          {role && !isCollapsed && (
            <div className={`mx-2 mb-4 flex items-center gap-2 rounded-lg px-3 py-1.5 ring-1 ${roleBadgeColor}`}>
              <AppIcon className="text-base" name={role === "admin" ? "admin_panel_settings" : "engineering"} />
              <span className="text-xs font-bold">{roleLabel}</span>
            </div>
          )}

          <div className={isCollapsed ? "md:px-1" : "px-2"}>
            <p
              className={[
                "mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400",
                isCollapsed ? "md:text-center md:text-[10px]" : "",
              ].join(" ")}
            >
              {isCollapsed ? "Nav" : "Menu"}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map(({ href, icon, label }) => {
              const active = isActivePath(pathname, href);

              return (
                <Link
                  key={href}
                  className={[
                    "group flex items-center rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                    active
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                    isCollapsed ? "md:justify-center" : "gap-3",
                  ].join(" ")}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  title={label}
                >
                  <AppIcon className="text-[20px]" name={icon} />
                  <span className={isCollapsed ? "md:hidden" : ""}>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-2 pt-6 space-y-2">
            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={[
                "w-full flex items-center rounded-xl px-3 py-3 text-sm font-semibold transition-all text-slate-500 hover:bg-red-500/10 hover:text-red-400 dark:text-slate-400 dark:hover:text-red-400",
                isCollapsed ? "md:justify-center" : "gap-3",
              ].join(" ")}
              title="Cerrar sesión"
            >
              <AppIcon className="text-[20px]" name="logout" />
              <span className={isCollapsed ? "md:hidden" : ""}>
                {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
              </span>
            </button>

            <div
              className={[
                "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900",
                isCollapsed ? "md:px-2 md:py-3" : "",
              ].join(" ")}
            >
              <p
                className={[
                  "text-xs font-bold uppercase tracking-[0.24em] text-slate-400",
                  isCollapsed ? "md:text-center" : "",
                ].join(" ")}
              >
                {isCollapsed ? "SF" : "SteelFlow Pro"}
              </p>
              <p
                className={[
                  "mt-2 text-sm text-slate-500 dark:text-slate-400",
                  isCollapsed ? "hidden md:hidden" : "",
                ].join(" ")}
              >
                Operaciones industriales centralizadas en un solo panel.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-background-light/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-background-dark/95 md:hidden">
          <button
            aria-label="Abrir sidebar"
            className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            onClick={() => setMobileOpen(true)}
          >
            <AppIcon className="text-xl" name="menu" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              SteelFlow Pro
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {currentSection}
            </p>
          </div>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
