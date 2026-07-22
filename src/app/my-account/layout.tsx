"use client";

import { ProtectedRoute } from "@/presentation/auth/protected-route";

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
