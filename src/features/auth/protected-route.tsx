"use client";

import { useAuth } from "./auth-provider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/features/auth/entities";
import { withActiveLocale } from "@/shared/ui/localized-link";

export function ProtectedRoute({
  children,
  roles,
  permission,
  permissionsAny,
  permissionsAll,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: string;
  permissionsAny?: string[];
  permissionsAll?: string[];
}) {
  const t = useTranslations("feedback");
  const { user, isLoading, sessionError, refreshUser, can, canAny, canAll } =
    useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const forbidden = Boolean(
    user &&
      ((roles && (!user.role || !roles.includes(user.role))) ||
        (permission && !can(permission)) ||
        (permissionsAny && !canAny(permissionsAny)) ||
        (permissionsAll && !canAll(permissionsAll))),
  );

  useEffect(() => {
    if (!isLoading && !sessionError && !user) {
      const query = searchParams.toString();
      const next = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(
        withActiveLocale(
          `/login?next=${encodeURIComponent(next)}`,
          pathname,
        ) as string,
      );
    }
    if (!isLoading && forbidden)
      router.replace(withActiveLocale("/forbidden", pathname) as string);
  }, [
    can,
    canAll,
    canAny,
    forbidden,
    isLoading,
    pathname,
    permission,
    permissionsAll,
    permissionsAny,
    roles,
    router,
    searchParams,
    sessionError,
    user,
  ]);

  if (!isLoading && sessionError && !user)
    return (
      <main className="page">
        <div className="empty">
          <p>{t("errorDescription")}</p>
          <button
            type="button"
            onClick={() => void refreshUser().catch(() => undefined)}
          >
            {t("retry")}
          </button>
        </div>
      </main>
    );

  if (isLoading || !user || forbidden)
    return (
      <main className="page">
        <div className="empty">{t("loading")}</div>
      </main>
    );

  return <>{children}</>;
}
