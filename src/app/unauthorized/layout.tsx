import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin acceso | SteelFlow Pro",
  description: "No tienes permisos para acceder a esta aplicación.",
};

export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
