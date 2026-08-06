"use client";

import { ProtectedRoute } from "./protected-route";

export function AdminPageGuard({
  permission,
  permissionsAll,
  children,
}: {
  permission?: string;
  permissionsAll?: string[];
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission={permission} permissionsAll={permissionsAll}>
      {children}
    </ProtectedRoute>
  );
}
