import { AdminPlaceholder } from "@/presentation/components/admin-placeholder";
import { adminPermissions } from "@/domain/auth/permissions";
import { AdminPageGuard } from "@/presentation/auth/admin-page-guard";
export default function AdminSettingsPage() {
  return (
    <AdminPageGuard permission={adminPermissions.settings}>
      <AdminPlaceholder titleKey="settings" detailKey="settingsDetail" />
    </AdminPageGuard>
  );
}
