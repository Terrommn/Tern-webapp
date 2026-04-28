import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101622]">
      <div className="text-center px-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#d41111]/10 ring-1 ring-[#d41111]/20">
          <AppIcon className="text-4xl text-[#d41111]" name="lock" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Acceso Denegado</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          No tienes permisos para acceder a esta sección. Contacta a tu administrador si crees que esto es un error.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-[#d41111] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-all"
        >
          <AppIcon className="text-lg" name="arrow_back" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
