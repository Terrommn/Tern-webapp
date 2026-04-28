import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "admin" | "operator";

const ADMIN_ONLY = ["/clientes", "/productos"];
const OPERATOR_ONLY = ["/progreso", "/desafios", "/misiones"];
const SHARED = ["/ordenes", "/simulador"];

function isAllowed(pathname: string, role: AppRole): boolean {
  if (role === "admin") {
    if (OPERATOR_ONLY.some((r) => pathname.startsWith(r))) return false;
    return true;
  }
  if (role === "operator") {
    if (pathname === "/") return false;
    if (ADMIN_ONLY.some((r) => pathname.startsWith(r))) return false;
    if (SHARED.some((r) => pathname.startsWith(r))) return true;
    if (OPERATOR_ONLY.some((r) => pathname.startsWith(r))) return true;
    return false;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[proxy] Missing env vars:",
      { url: !!supabaseUrl, key: !!supabaseKey }
    );
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public and static routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Allow auth-related routes
  if (pathname.startsWith("/auth") || pathname.startsWith("/unauthorized")) {
    return response;
  }

  // Login page: redirect if already authenticated
  if (pathname.startsWith("/login")) {
    if (user) {
      const role = user.app_metadata?.role as AppRole;
      const dest = role === "operator" ? "/ordenes" : "/";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return response;
  }

  // All other routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.app_metadata?.role as AppRole | undefined;

  if (!role || !isAllowed(pathname, role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Set role cookie (not httpOnly so client can read for UI rendering)
  response.cookies.set("sf-role", role, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|gz|data)$).*)",
  ],
};
