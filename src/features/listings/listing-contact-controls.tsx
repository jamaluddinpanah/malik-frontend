"use client";
import { Button } from "@/shared/ui/form-controls";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { useAuth } from "@/features/auth/auth-provider";

export function ListingContactControls({ listingId, ownerUserId, phoneVisible, phone, email }: { listingId: number; ownerUserId?: number; phoneVisible: boolean; phone?: string; email?: string }) {
  const t = useTranslations("listing");
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(phone ?? "");
  const [loginRequired, setLoginRequired] = useState(false);
  const [limited, setLimited] = useState(false);
  if (user && ownerUserId === user.id) return null;
  async function revealPhone() {
    try {
      await apiClient.csrfCookie();
      const response = await apiClient.request<{ data: { phone: string } }>(routes.api.listingPhoneReveal(listingId), { method: "POST" });
      setRevealed(response.data.phone);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setLoginRequired(true);
      else if (error instanceof ApiError && error.status === 429) setLimited(true);
    }
  }
  async function track(eventType: "whatsapp_click" | "email_click") {
    await apiClient.csrfCookie().catch(() => undefined);
    await apiClient.request(routes.api.listingContactEvents(listingId), { method: "POST", body: { event_type: eventType } }).catch(() => undefined);
  }
  return <>
    {phoneVisible ? revealed ? <a href={`tel:${revealed}`}>{revealed}</a> : <Button variant="ghost" type="button" onClick={() => revealPhone()}>{t("showPhone")}</Button> : null}
    {revealed ? <a href={`https://wa.me/${revealed.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click")}>{t("whatsapp")}</a> : null}
    {loginRequired ? <small>{t("phoneLoginRequired")} <Link href="/login">{t("login")}</Link></small> : null}
    {limited ? <small>{t("contactRateLimited")}</small> : null}
    {email ? <a href={`mailto:${email}`} onClick={() => track("email_click")}>{t("emailSeller")}</a> : null}
  </>;
}
