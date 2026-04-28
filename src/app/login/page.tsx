"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
  Activity,
  BarChart3,
  Boxes,
} from "lucide-react";

const FLOATING_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 37) % 100,
  y: (i * 53 + 17) % 100,
  size: (i % 3) + 1,
  duration: 15 + (i % 8) * 2,
  delay: i % 10,
}));

/* ─── Animated grid background ─── */
function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,17,17,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,17,17,.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#d41111]/[0.07] blur-[120px]" />
      <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-[#d41111]/[0.04] blur-[100px]" />
    </div>
  );
}

/* ─── Floating particles ─── */
function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLOATING_PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#d41111]/20 animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Scan line effect ─── */
function ScanLine() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d41111]/30 to-transparent"
        style={{
          animation: "scanline 6s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes scanline {
          0%, 100% { top: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 102%; }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Login Page ─── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError("Correo o contraseña incorrectos.");
        setIsLoading(false);
        return;
      }

      const role = data.user.app_metadata?.role;
      router.push(role === "operator" ? "/ordenes" : "/");
      router.refresh();
    },
    [email, password, router]
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#101622] overflow-hidden">
      <GridBackground />
      <FloatingParticles />
      <ScanLine />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center gap-10 px-4 py-10 lg:flex-row lg:gap-16 lg:py-0">
        {/* ─── Left: Branding & stats ─── */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-[#d41111]/30 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#d41111] to-[#a60d0d] shadow-lg shadow-[#d41111]/25">
                <AppIcon className="text-3xl text-white" name="precision_manufacturing" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                SteelFlow
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d41111]">
                Pro
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d41111]/20 bg-[#d41111]/10 px-4 py-1.5 text-xs font-semibold text-[#ef5b5b] mb-5">
            <Shield className="h-3.5 w-3.5" />
            Acceso Industrial Seguro
          </div>

          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Control total de tus
            <br />
            <span className="bg-gradient-to-r from-[#d41111] to-[#ef5b5b] bg-clip-text text-transparent">
              operaciones de acero
            </span>
          </h2>

          <p className="mt-4 max-w-md text-base text-slate-400">
            Monitoreo en tiempo real, logística inteligente y análisis de producción en una sola plataforma industrial.
          </p>

          {/* Stats */}
          <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
            {[
              { icon: Activity, value: "99.9%", label: "Uptime" },
              { icon: BarChart3, value: "24/7", label: "Monitoreo" },
              { icon: Boxes, value: "500+", label: "Órdenes/día" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group rounded-xl border border-[#282e39] bg-[#1c1f27]/80 p-4 backdrop-blur transition-all duration-300 hover:border-[#d41111]/30 hover:bg-[#1c1f27]"
              >
                <stat.icon className="mb-2 h-5 w-5 text-[#d41111] transition-transform duration-300 group-hover:scale-110" />
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] font-medium text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right: Login Card ─── */}
        <div className="w-full max-w-[420px] flex-shrink-0">
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-[#d41111]/20 via-transparent to-transparent opacity-60 blur-sm" />

            <div className="relative overflow-hidden rounded-2xl border border-[#282e39] bg-[#1c1f27]/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
              {/* Top accent line */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#d41111] to-transparent" />

              <div className="p-8">
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#d41111]/10 ring-1 ring-[#d41111]/20">
                    <AppIcon className="text-2xl text-[#d41111]" name="lock" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Bienvenido de vuelta
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Ingresa tus credenciales para acceder
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  {/* Email */}
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Correo electrónico
                    </label>
                    <div
                      className={[
                        "flex items-center gap-3 rounded-xl border bg-[#101622]/60 px-4 py-3 transition-all duration-200",
                        focusedField === "email"
                          ? "border-[#d41111] ring-2 ring-[#d41111]/20"
                          : "border-[#282e39] hover:border-slate-600",
                      ].join(" ")}
                    >
                      <Mail className="h-4 w-4 text-slate-500" />
                      <input
                        id="email"
                        type="email"
                        placeholder="tu@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Contraseña
                    </label>
                    <div
                      className={[
                        "flex items-center gap-3 rounded-xl border bg-[#101622]/60 px-4 py-3 transition-all duration-200",
                        focusedField === "password"
                          ? "border-[#d41111] ring-2 ring-[#d41111]/20"
                          : "border-[#282e39] hover:border-slate-600",
                      ].join(" ")}
                    >
                      <Lock className="h-4 w-4 text-slate-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-500 transition-colors hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember / Forgot */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-400">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-[#282e39] bg-[#101622] accent-[#d41111]"
                      />
                      Recordarme
                    </label>
                    <button
                      type="button"
                      className="font-semibold text-[#d41111] transition-colors hover:text-[#ef5b5b]"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d41111] to-[#e81515] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d41111]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#d41111]/30 hover:brightness-110 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Verificando acceso...
                      </>
                    ) : (
                      <>
                        Iniciar Sesión
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#282e39]" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    o
                  </span>
                  <div className="h-px flex-1 bg-[#282e39]" />
                </div>

                {/* SSO placeholder */}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#282e39] bg-[#101622]/40 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-[#101622]/70"
                >
                  <AppIcon className="text-lg" name="domain" />
                  Acceso con SSO Corporativo
                </button>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-600">
                  ¿No tienes cuenta?{" "}
                  <span className="cursor-pointer font-semibold text-[#d41111] hover:text-[#ef5b5b]">
                    Contacta a tu administrador
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[#282e39]/50 bg-[#101622]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-3 text-[11px] text-slate-600">
          <p>© 2026 SteelFlow Pro — Industrial Management System</p>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-slate-500">Todos los sistemas operativos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
