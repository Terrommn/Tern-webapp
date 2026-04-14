"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { STEELFLOW_AVATAR_URL } from "@/lib/steelflow-constants";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/ordenes", label: "Orders" },
] as const;

export function SteelFlowHeader({ searchPlaceholder = "Buscar..." }: { searchPlaceholder?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-background-light px-6 py-3 dark:border-slate-800 dark:bg-background-dark lg:px-10">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3 text-primary" href="/">
            <AppIcon className="text-3xl" name="precision_manufacturing" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              SteelFlow Pro
            </h2>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={`${href}-${label}`}
                  className={
                    isActive
                      ? "border-b-2 border-primary pb-1 text-sm font-semibold text-primary"
                      : "text-sm font-medium text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                  }
                  href={href}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <AppIcon
              className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              name="search"
            />
            <input
              className="w-64 rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
          <button
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            type="button"
          >
            <AppIcon className="text-xl" name="notifications" />
            <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background-dark bg-red-500" />
          </button>
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            type="button"
          >
            <AppIcon className="text-xl" name="settings" />
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/20"
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <Image
                alt="User profile avatar"
                className="object-cover"
                height={32}
                src={STEELFLOW_AVATAR_URL}
                width={32}
              />
            </button>
            {userMenuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40"
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    type="button"
                    onClick={handleSignOut}
                  >
                    <AppIcon className="text-lg" name="logout" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
