import type { Metadata } from "next";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { AdminShell } from "@/features/admin/admin-shell";
import { adminPermissions } from "@/features/auth/permissions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

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
