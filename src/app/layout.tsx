import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GamificationProvider } from "@/components/steelflow/GamificationProvider";


const inter = Inter({
  variable: "--font-steelflow-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SteelFlow Pro - Control Panel",
  description: "Industrial steel production monitoring and logistics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-display antialiased min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100`}>
        <GamificationProvider>{children}</GamificationProvider>
      </body>
    </html>
  );
}
