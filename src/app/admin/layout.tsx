"use client";

import { ProtectedRoute } from "@/presentation/auth/protected-route";
import { AdminShell } from "@/presentation/components/admin-shell";
import { adminPermissions } from "@/domain/auth/permissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission={adminPermissions.access}>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
