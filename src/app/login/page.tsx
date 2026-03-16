"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

/* ─── Animated grid background ─── */
function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,82,212,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(17,82,212,.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#1152d4]/[0.07] blur-[120px]" />
      <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-[#1152d4]/[0.04] blur-[100px]" />
    </div>
  );
}

/* ─── Floating particles ─── */
function FloatingParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
      }))
    );
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#1152d4]/20 animate-pulse"
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
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#1152d4]/30 to-transparent"
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      // Placeholder — set session cookie then redirect
      setTimeout(() => {
        document.cookie = "steelflow-session=active; path=/; max-age=86400";
        router.push("/");
      }, 1800);
    },
    [router]
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
              <div className="absolute inset-0 rounded-xl bg-[#1152d4]/30 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#1152d4] to-[#0d3fa6] shadow-lg shadow-[#1152d4]/25">
                <span className="material-symbols-outlined text-3xl text-white">
                  precision_manufacturing
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                SteelFlow
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#1152d4]">
                Pro
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1152d4]/20 bg-[#1152d4]/10 px-4 py-1.5 text-xs font-semibold text-[#5b8def] mb-5">
            <Shield className="h-3.5 w-3.5" />
            Acceso Industrial Seguro
          </div>

          <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Control total de tus
            <br />
            <span className="bg-gradient-to-r from-[#1152d4] to-[#5b8def] bg-clip-text text-transparent">
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
                className="group rounded-xl border border-[#282e39] bg-[#1c1f27]/80 p-4 backdrop-blur transition-all duration-300 hover:border-[#1152d4]/30 hover:bg-[#1c1f27]"
              >
                <stat.icon className="mb-2 h-5 w-5 text-[#1152d4] transition-transform duration-300 group-hover:scale-110" />
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
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-[#1152d4]/20 via-transparent to-transparent opacity-60 blur-sm" />

            <div className="relative overflow-hidden rounded-2xl border border-[#282e39] bg-[#1c1f27]/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
              {/* Top accent line */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#1152d4] to-transparent" />

              <div className="p-8">
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1152d4]/10 ring-1 ring-[#1152d4]/20">
                    <span className="material-symbols-outlined text-2xl text-[#1152d4]">
                      lock
                    </span>
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
                          ? "border-[#1152d4] ring-2 ring-[#1152d4]/20"
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
                          ? "border-[#1152d4] ring-2 ring-[#1152d4]/20"
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
                        className="h-3.5 w-3.5 rounded border-[#282e39] bg-[#101622] accent-[#1152d4]"
                      />
                      Recordarme
                    </label>
                    <button
                      type="button"
                      className="font-semibold text-[#1152d4] transition-colors hover:text-[#5b8def]"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1152d4] to-[#1565e8] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1152d4]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#1152d4]/30 hover:brightness-110 disabled:opacity-70"
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
                  <span className="material-symbols-outlined text-lg">
                    domain
                  </span>
                  Acceso con SSO Corporativo
                </button>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-600">
                  ¿No tienes cuenta?{" "}
                  <span className="cursor-pointer font-semibold text-[#1152d4] hover:text-[#5b8def]">
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
