import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/presentation/components/site-footer";
import { SiteHeader } from "@/presentation/components/site-header";

export const metadata: Metadata = {
  title: "Malik | Afghanistan marketplace",
  description: "Buy and sell with confidence in Afghanistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><SiteHeader />{children}<SiteFooter /></body>
    </html>
  );
}
