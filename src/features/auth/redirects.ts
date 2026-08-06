import type { AuthUser } from "@/features/auth/entities";
import { locales } from "@/shared/i18n/config";

export function dashboardPath(
  user: Pick<AuthUser, "permissions" | "roles">,
): "/admin" | "/account" {
  return user.roles.includes("superadmin") ||
    user.permissions.includes("admin.access")
    ? "/admin"
    : "/account";
}

/** Prevent open redirects; only application-relative non-locale paths are allowed. */
export function safeInternalRedirect(
  value: string | null | undefined,
): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return null;
  if (
    locales.some(
      (locale) => value === `/${locale}` || value.startsWith(`/${locale}/`),
    )
  )
    return null;
  return value;
}

export function isAdminPath(value: string): boolean {
  return value === "/admin" || value.startsWith("/admin/");
}
