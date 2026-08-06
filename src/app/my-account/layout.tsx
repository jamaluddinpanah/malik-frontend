"use client";

import { ProtectedRoute } from "@/features/auth/protected-route";

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
