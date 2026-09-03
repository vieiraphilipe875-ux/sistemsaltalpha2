import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pauta — Gestão de Conteúdo",
  description: "Pautas, responsáveis, prazos e revisões visuais em um só lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}<Toaster richColors position="top-right" /></body>
    </html>
  );
}
