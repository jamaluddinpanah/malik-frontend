"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink as Link, withActiveLocale } from "@/shared/ui/localized-link";
import { useAuth } from "@/features/auth/auth-provider";

export function MessageSellerButton({ listingId, ownerUserId }: { listingId: number; ownerUserId?: number }) {
  const t = useTranslations("listing");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "starting" | "error">("idle");
  const [failure, setFailure] = useState("");
  if (user && ownerUserId === user.id) return null;
  async function start() {
    setState("starting");
    try {
      await apiClient.csrfCookie();
      const response = await apiClient.request<{ data: { id: number } }>(routes.api.listingConversation(listingId), { method: "POST" });
       router.push(String(withActiveLocale(`/my-account/messages?conversation=${response.data.id}`, pathname)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFailure("");
        setState("error");
        return;
      }
      setFailure(error instanceof ApiError && error.status === 403 ? t("messageBlocked") : t("messageError"));
      setState("error");
    }
  }
  if (state === "error") return user ? <span><button type="button" onClick={() => void start()}>{t("messageSeller")}</button><small role="alert">{failure}</small></span> : <Link href="/login">{t("loginToMessage")}</Link>;
  return <button type="button" onClick={() => void start()} disabled={state === "starting"}>{state === "starting" ? t("startingMessage") : t("messageSeller")}</button>;
}
