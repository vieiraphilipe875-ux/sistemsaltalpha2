import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";
import "lenis/dist/lenis.css";
import "./design-v4.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Postito | Sua agência, com tudo no lugar",
  description: "Demandas, clientes, CRM e financeiro. Um espaço para cada agência e uma conta para você.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}<SmoothScroll/><Toaster richColors position="top-right" /></body>
    </html>
  );
}
