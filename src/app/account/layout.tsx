import type { Metadata } from "next";
import { ProtectedRoute } from "@/presentation/auth/protected-route";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
