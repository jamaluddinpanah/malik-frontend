"use client";

import { Heart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";

export function FavoriteButton({ listingId, initial = false }: { listingId: number; initial?: boolean }) {
  const t = useTranslations("listing");
  const [saved, setSaved] = useState(initial);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void apiClient.request<{ data: { favorited: boolean } }>(routes.api.listingFavorite(listingId)).then((response) => setSaved(response.data.favorited)).catch(() => undefined);
  }, [listingId]);
  async function save() {
    if (saving || saved) return;
    setError(false);
    setSaving(true);
    try {
      await apiClient.csrfCookie();
      const response = await apiClient.request<{ data?: { favorited?: boolean } }>(routes.api.listingFavorite(listingId), { method: "POST" });
      setSaved(response.data?.favorited ?? false);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) setRequiresLogin(true);
      else setError(true);
    } finally {
      setSaving(false);
    }
  }
  if (requiresLogin) return <Link href="/login" className="favorite-login"><Heart size={16} /> {t("save")}</Link>;
  if (error) return <button type="button" className="favorite-button" onClick={() => void save()} disabled={saving}><Heart size={16} /> {t("favoriteError")}</button>;
  return <button type="button" className={`favorite-button ${saved ? "saved" : ""} ${saving ? "saving" : ""}`} onClick={() => void save()} disabled={saving} aria-pressed={saved} aria-live="polite" aria-label={saved ? t("saved") : t("save")} title={saved ? t("saved") : t("save")}><span aria-hidden="true">{saving ? <LoaderCircle className="favorite-spinner" size={17} /> : <Heart size={17} fill={saved ? "currentColor" : "none"} />}</span><span>{saving ? t("savingFavorite") : saved ? t("saved") : t("save")}</span></button>;
}
