"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, apiClient, type ApiResponse } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { useAuth } from "@/features/auth/auth-provider";
import { adminPermissions } from "@/features/auth/permissions";
import { CategorySelector } from "@/features/catalog/category-selector";
import {
  CurrencySelector,
  type Currency,
} from "@/features/catalog/currency-selector";
import { DynamicFormRenderer } from "@/features/catalog/dynamic-form-renderer";
import { ListingLocationPicker, type ListingLocationValue } from "@/features/listings/listing-location-picker";
import { RichTextEditor } from "@/shared/ui";
import type {
  ApiCategory,
  CategoryFormSchema,
  CategoryPath,
  DynamicFormValues,
} from "@/features/catalog/category-types";
import type { AppLocale } from "@/shared/i18n/config";
import styles from "./post-ad.module.css";

type ListingResponse = { id: number; listing_number?: string; slug?: string; status?: string };
const locales = ["en", "fa", "ps"] as const;
type TranslationLocale = (typeof locales)[number];
type ListingTranslations = Record<TranslationLocale, { title: string; description: string }>;
const emptyTranslations = (): ListingTranslations => ({ en: { title: "", description: "" }, fa: { title: "", description: "" }, ps: { title: "", description: "" } });
const emptyLocation = (): ListingLocationValue => ({ address: "", administrativeAreaId: null, latitude: null, longitude: null });
type ExistingListing = ListingResponse & {
  title: string;
  description: string;
  price?: number | string | null;
  minimum_price?: number | string | null;
  maximum_price?: number | string | null;
  price_type?: string;
  salary_period?: string | null;
  language_code?: TranslationLocale | null;
  is_phone_visible?: boolean;
  is_urgent?: boolean;
  currency_id?: number | string | null;
  category: { id: number; slug: string; name?: string | null; root_type?: string | null };
  values?: Array<Record<string, unknown> & { attribute_id: number }>;
  translations?: Array<{ locale: TranslationLocale; title: string; description: string }>;
  media?: Array<{ id: number; url?: string; thumbnail_url?: string | null; original_name?: string | null; is_cover?: boolean; sort_order?: number }>;
  address?: string | null;
  administrative_area_id?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};
type ListingHistoryEvent = { id: number; kind: "status" | "moderation"; created_at: string; from_status: string | null; to_status: string | null; reason: string | null; decision: string | null; reason_code: string | null; notes: string | null };
type ListingHistoryPage = { data: ListingHistoryEvent[]; next_cursor: string | null };
type DraftStatus = "idle" | "saving" | "saved" | "failed";
type PendingMedia = { file: File; preview: string; status: "ready" | "uploading" | "uploaded" | "failed" };
type ExistingMedia = { id: number; preview: string; name: string; status: "existing" };
type MediaItem = PendingMedia | ExistingMedia;

export default function PostAd() {
  const t = useTranslations("postAd");
  const locale = useLocale() as AppLocale;
  const { user, isLoading: isAuthLoading } = useAuth();
  const allowCategory = useCallback((item: ApiCategory) => item.root_type !== "job" || user?.role === "superadmin" || Boolean(user?.permissions.includes("jobs.create")), [user]);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [path, setPath] = useState<CategoryPath>([]);
  const [schema, setSchema] = useState<CategoryFormSchema | null>(null);
  const [values, setValues] = useState<DynamicFormValues>({});
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [currencyId, setCurrencyId] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<ListingTranslations>(emptyTranslations);
  const [priceType, setPriceType] = useState("fixed");
  const [price, setPrice] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("monthly");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
  const [history, setHistory] = useState<ListingHistoryEvent[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyPages, setHistoryPages] = useState<Array<{ cursor: string; count: number }>>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [location, setLocation] = useState<ListingLocationValue>(emptyLocation);
  const locationRef = useRef(location);
  const previousListingId = useRef(searchParams.get("listing"));

  const updateLocation = useCallback((next: ListingLocationValue) => {
    locationRef.current = next;
    setLocation(next);
  }, []);

  function requestMessage(error: unknown): string {
    if (!(error instanceof ApiError)) return t("error");
    if (error.status === 401) return t("unauthorized");
    if (error.status === 403) return t("forbidden");
    if (error.status === 409) return t("conflict");
    if (error.status === 422) return Object.values(error.errors).flat()[0] || error.message || t("validationError");
    if (error.status >= 500) return t("serverError");
    if (error.status === 0) return t("networkError");
    return error.message || t("error");
  }
  const requestMessageEvent = useEffectEvent(requestMessage);

  function updateCategoryRoute(categoryId: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === null) params.delete("category");
    else params.set("category", String(categoryId));
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  function resetForm() {
    setCategory(null);
    setPath([]);
    setSchema(null);
    setValues({});
    setCurrency(null);
    setCurrencyId(undefined);
    setErrors({});
    setMessage("");
    setListing(null);
    setTranslations(emptyTranslations());
    setPriceType("fixed");
    setPrice("");
    setMinimumPrice("");
    setMaximumPrice("");
    setSalaryPeriod("monthly");
    setPhoneVisible(false);
    setUrgent(false);
    setDraftId(null);
    setDraftStatus("idle");
    setMedia([]);
    setRemovedMediaIds([]);
    setHistory([]);
    setHistoryCursor(null);
    setHistoryPages([]);
    setHistoryExpanded(false);
    setHistoryError("");
    updateLocation(emptyLocation());
  }

  async function selectCategory(next: ApiCategory, nextPath: CategoryPath, persist = true): Promise<CategoryFormSchema | null> {
    setCategory(next);
    setPath(nextPath);
    setSchema(null);
    setValues({});
    setTranslations(emptyTranslations());
    setPriceType("fixed");
    setPrice("");
    setMinimumPrice("");
    setMaximumPrice("");
    setSalaryPeriod("monthly");
    setPhoneVisible(false);
    setUrgent(false);
    setCurrency(null);
    setCurrencyId(undefined);
    setDraftId(null);
    setDraftStatus("idle");
    setMedia([]);
    setRemovedMediaIds([]);
    setHistory([]);
    setHistoryCursor(null);
    setHistoryPages([]);
    setHistoryExpanded(false);
    setHistoryError("");
    updateLocation(emptyLocation());
    setErrors({});
    setMessage("");
    setLoading(true);
    if (persist) updateCategoryRoute(next.id);
    try {
      const response = await apiClient.request<ApiResponse<CategoryFormSchema>>(
        routes.api.categoryFormSchema(next.id),
        { cache: "no-store" },
      );
      setSchema(response.data);
      return response.data;
    } catch (error) {
      setMessage(error instanceof ApiError ? requestMessage(error) : t("schemaError"));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(listingId: number, cursor: string | null = null) {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const query = new URLSearchParams({ per_page: "5" });
      if (cursor) query.set("cursor", cursor);
      const response = await apiClient.request<ApiResponse<ListingHistoryPage>>(
        `${routes.api.listingHistory(listingId)}?${query}`,
      );
      const events = response.data.data;
      if (cursor) setHistoryPages((pages) => [...pages, { cursor, count: events.length }]);
      setHistory((current) => {
        if (!cursor) return events;
        const added = events.filter((event) => !current.some((item) => item.kind === event.kind && item.id === event.id));
        return [...current, ...added];
      });
      setHistoryCursor(response.data.next_cursor);
      if (cursor) setHistoryExpanded(true);
      else setHistoryPages([]);
    } catch (error) {
      setHistoryError(error instanceof ApiError ? requestMessageEvent(error) : t("historyLoadError"));
    } finally {
      setHistoryLoading(false);
    }
  }

  function showLessHistory() {
    const previousPage = historyPages.at(-1);
    if (!previousPage) return;
    setHistory((current) => current.slice(0, -previousPage.count));
    setHistoryCursor(previousPage.cursor);
    setHistoryPages((pages) => pages.slice(0, -1));
    setHistoryExpanded(history.length - previousPage.count > 5);
  }

  useEffect(() => {
    const existingId = searchParams.get("listing");
    if (!existingId) return;
    const listingId = existingId;
    // This flag prevents the autosave effect from treating hydrated data as a new draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrating(true);
    let cancelled = false;
    async function loadExisting() {
      setLoading(true);
      try {
        const response = await apiClient.request<ApiResponse<ExistingListing>>(routes.api.listing(listingId));
        if (cancelled) return;
        const existing = response.data;
        const nextCategory: ApiCategory = { id: existing.category.id, slug: existing.category.slug, name: existing.category.name ?? existing.category.slug, description: null, children: [], is_leaf: true, is_selectable: true, allow_listings: true, root_type: existing.category.root_type };
        const nextSchema = await selectCategory(nextCategory, [nextCategory], false);
        if (cancelled) return;
        setTranslations(Object.fromEntries(locales.map((item) => {
          const translation = existing.translations?.find((candidate) => candidate.locale === item);
          return [item, translation ?? (item === (existing.language_code ?? "en") ? { title: existing.title, description: existing.description } : { title: "", description: "" })];
        })) as ListingTranslations);
        setPrice(existing.price == null ? "" : String(existing.price));
        setMinimumPrice(existing.minimum_price == null ? "" : String(existing.minimum_price));
        setMaximumPrice(existing.maximum_price == null ? "" : String(existing.maximum_price));
        setPriceType(existing.price_type ?? "fixed");
        setSalaryPeriod(existing.salary_period ?? "monthly");
        setPhoneVisible(Boolean(existing.is_phone_visible));
        setUrgent(Boolean(existing.is_urgent));
        setCurrencyId(existing.currency_id == null ? undefined : Number(existing.currency_id));
        updateLocation({ address: existing.address ?? "", administrativeAreaId: existing.administrative_area_id == null ? null : Number(existing.administrative_area_id), latitude: existing.latitude == null ? null : Number(existing.latitude), longitude: existing.longitude == null ? null : Number(existing.longitude) });
        setDraftId(existing.id);
        setDraftStatus("saved");
        void loadHistory(existing.id);
        setMedia((existing.media ?? []).map((item) => ({
          id: item.id,
          preview: item.thumbnail_url ?? item.url ?? "",
          name: item.original_name ?? t("media"),
          status: "existing" as const,
        })));
        setRemovedMediaIds([]);
        if (nextSchema) {
          const nextValues: DynamicFormValues = {};
          for (const item of existing.values ?? []) {
            const field = nextSchema.fields.find((candidate) => candidate.attribute_id === item.attribute_id);
            if (!field) continue;
            nextValues[field.code] = (item.string_value ?? item.text_value ?? item.integer_value ?? item.decimal_value ?? item.boolean_value ?? item.json_value ?? null) as DynamicFormValues[string];
          }
          setValues(nextValues);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof ApiError ? requestMessage(error) : t("error"));
      } finally {
        setHydrating(false);
        if (!cancelled) setLoading(false);
      }
    }
    void loadExisting();
    return () => { cancelled = true; };
    // Load the requested draft once; the form helpers intentionally use the current locale state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (previousListingId.current && !listingId) resetForm();
    previousListingId.current = listingId;
  }, [searchParams]);

  useEffect(() => {
    if (isAuthLoading || searchParams.get("listing")) return;
    const categoryId = Number(searchParams.get("category"));
    if (!Number.isInteger(categoryId) || categoryId < 1 || category?.id === categoryId) return;
    let cancelled = false;

    async function restoreCategory() {
      try {
        const response = await apiClient.request<ApiResponse<ApiCategory>>(
          routes.api.categoryDetails(categoryId),
          { cache: "no-store" },
        );
        if (!cancelled && allowCategory(response.data)) {
          await selectCategory(response.data, [response.data], false);
        }
      } catch (error) {
        if (!cancelled) setMessage(requestMessageEvent(error));
      }
    }

    void restoreCategory();
    return () => {
      cancelled = true;
    };
    // Wait for role permissions before restoring restricted job categories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowCategory, category?.id, isAuthLoading, searchParams]);

  const isJobCategory = category?.root_type === "job";

  const saveDraft = useCallback(async (): Promise<ListingResponse | null> => {
    if (hydrating) return draftId ? { id: draftId } : null;
    if (!category || !locales.every((item) => translations[item].title.trim() && translations[item].description.trim())) return draftId ? { id: draftId } : null;
    setDraftStatus("saving");
    try {
      await apiClient.csrfCookie();
      const currentLocation = locationRef.current;
      const body = {
        category_id: category.id,
        language_code: locale,
        translations: Object.fromEntries(locales.map((item) => [item, { title: translations[item].title.trim(), description: translations[item].description.trim() }])),
        price_type: priceType,
        price: !isJobCategory || priceType === "fixed" ? (price ? Number(price) : null) : null,
        minimum_price: isJobCategory && priceType === "range" && minimumPrice ? Number(minimumPrice) : null,
        maximum_price: isJobCategory && priceType === "range" && maximumPrice ? Number(maximumPrice) : null,
        currency_id: currency?.id ?? currencyId ?? null,
        salary_period: isJobCategory ? salaryPeriod : null,
        is_phone_visible: phoneVisible,
        is_urgent: urgent,
        address: currentLocation.address.trim() || null,
        administrative_area_id: currentLocation.administrativeAreaId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        attributes: values,
      };
      const response = draftId
        ? await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listing(draftId), { method: "PATCH", body })
        : await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listings, { method: "POST", body });
      const id = response.data.id;
      setDraftId(id);
      setDraftStatus("saved");
      return response.data;
    } catch (error) {
      setDraftStatus("failed");
      throw error;
    }
  }, [category, currency, currencyId, draftId, hydrating, isJobCategory, locale, maximumPrice, minimumPrice, phoneVisible, price, priceType, salaryPeriod, translations, urgent, values]);

  useEffect(() => {
    if (searchParams.get("listing")) return;
    if (!category || !locales.every((item) => translations[item].title.trim() && translations[item].description.trim())) return;
    const timeout = window.setTimeout(() => void saveDraft().catch((error) => setMessage(requestMessageEvent(error))), 900);
    return () => window.clearTimeout(timeout);
  }, [category, saveDraft, searchParams, translations, values]);

  function addMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setMedia((current) => {
      return [...current, ...files.slice(0, 12 - current.length).map((file) => ({ file, preview: URL.createObjectURL(file), status: "ready" as const }))];
    });
    event.target.value = "";
  }

  async function uploadMedia(id: number) {
    const pending = media.filter((item): item is PendingMedia => "file" in item && (item.status === "ready" || item.status === "failed"));
    const idsToRemove = [...new Set(removedMediaIds)];
    if (!pending.length && !idsToRemove.length) return;
    for (const mediaId of idsToRemove) {
      await apiClient.request(routes.api.listingMediaItem(id, mediaId), { method: "DELETE" });
    }
    // Deletions do not need an upload request; posting an empty FormData body fails API validation.
    if (!pending.length) return;
    setMedia((current) => current.map((item) => "file" in item && pending.includes(item) ? { ...item, status: "uploading" as const } : item));
    const body = new FormData();
    pending.forEach((item) => body.append("media[]", item.file));
    try {
      await apiClient.request(routes.api.listingMedia(id), { method: "POST", body });
       setMedia((current) => current.map((item) => "file" in item && pending.includes(item) ? { ...item, status: "uploaded" as const } : item));
    } catch (error) {
      setMedia((current) => current.map((item) => "file" in item && pending.includes(item) ? { ...item, status: "failed" as const } : item));
      throw error;
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    setListing(null);
    setLoading(true);
    try {
      const saved = await saveDraft();
      if (!saved) throw new Error("Draft could not be saved.");
      await uploadMedia(saved.id);
      if (saved.status === "pending") {
        setListing(saved);
        setMessage(t("resubmitted"));
        return;
      }
      const response = await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listingSubmit(saved.id), { method: "POST" });
      setListing(response.data);
      setMessage(t("success"));
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        setMessage(requestMessage(error));
      } else setMessage(requestMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute permission={adminPermissions.listingsCreate}>
      <main className={styles.scope}>
        <div className="posting-main">
          <div className="posting-shell">
            <section className="category-picker">
              <h1>{t("title")}</h1>
              <p>{t("description")}</p>
              {!category ? (
                <CategorySelector
                  allowCategory={allowCategory}
                  onSelect={(next, nextPath) =>
                    void selectCategory(next, nextPath)
                  }
                />
              ) : (
                <>
                  <nav className="breadcrumbs" aria-label={t("breadcrumbs")}>
                    {path.map((item, index) => (
                      <span key={item.id}>
                        {index ? " / " : ""}
                        {item.name ?? item.slug}
                      </span>
                    ))}
                  </nav>
                  <button
                    type="button"
                    className="change-category"
                    onClick={() => {
                      setCategory(null);
                      setSchema(null);
                      updateCategoryRoute(null);
                    }}
                  >
                    {t("changeCategory")}
                  </button>
                  {loading && !schema ? (
                    <p role="status">{t("loading")}</p>
                  ) : null}
                  {message && !listing ? <p role="alert">{message}</p> : null}
                  {schema ? (
                    <form className="posting-form" onSubmit={submit}>
                      <h2>{t("detailsTitle")}</h2>
                      {locales.map((item) => <label key={item}>
                        {t("localizedTitle", { language: t(`languages.${item}`) })}
                        <input dir={item === "en" ? "ltr" : "rtl"} name={`translations.${item}.title`} required maxLength={255} value={translations[item].title} onChange={(event) => setTranslations((current) => ({ ...current, [item]: { ...current[item], title: event.target.value } }))} aria-invalid={Boolean(errors[`translations.${item}.title`])} />
                        {errors[`translations.${item}.title`]?.[0] ? <small role="alert">{errors[`translations.${item}.title`][0]}</small> : null}
                      </label>)}
                      {isJobCategory ? (
                        <>
                          <label>
                            {t("salaryType")}
                            <select name="price_type" value={priceType} onChange={(event) => setPriceType(event.target.value)}>
                              <option value="fixed">{t("fixedSalary")}</option>
                              <option value="range">{t("salaryRange")}</option>
                              <option value="negotiable">{t("negotiable")}</option>
                              <option value="not_disclosed">{t("notDisclosed")}</option>
                            </select>
                          </label>
                          {priceType === "fixed" ? <label>
                            {t("salary")}
                            <input name="price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} aria-invalid={Boolean(errors.price)} />
                            {errors.price?.[0] ? <small role="alert">{errors.price[0]}</small> : null}
                          </label> : null}
                          {priceType === "range" ? <>
                            <label>
                              {t("minimumSalary")}
                              <input name="minimum_price" type="number" min="0" step="any" inputMode="decimal" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} aria-invalid={Boolean(errors.minimum_price)} />
                              {errors.minimum_price?.[0] ? <small role="alert">{errors.minimum_price[0]}</small> : null}
                            </label>
                            <label>
                              {t("maximumSalary")}
                              <input name="maximum_price" type="number" min="0" step="any" inputMode="decimal" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} aria-invalid={Boolean(errors.maximum_price)} />
                              {errors.maximum_price?.[0] ? <small role="alert">{errors.maximum_price[0]}</small> : null}
                            </label>
                          </> : null}
                        </>
                      ) : <>
                        <label>
                          {t("priceType")}
                          <select name="price_type" value={priceType} onChange={(event) => setPriceType(event.target.value)}>
                            <option value="fixed">{t("fixed")}</option>
                            <option value="negotiable">{t("negotiable")}</option>
                            <option value="contact">{t("contact")}</option>
                          </select>
                        </label>
                        <label>
                          {t("price")}{currency ? ` (${currency.code})` : ""}
                          <input name="price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} aria-invalid={Boolean(errors.price)} />
                          {errors.price?.[0] ? <small role="alert">{errors.price[0]}</small> : null}
                        </label>
                      </>}
                      <label>
                        {t("currency")}
                        <CurrencySelector
                          value={currency?.id ?? currencyId}
                          onChange={(next) => {
                            setCurrency(next);
                            setCurrencyId(next.id);
                          }}
                        />
                      </label>
                      {isJobCategory && priceType !== "not_disclosed" ? <label>
                        {t("payPeriod")}
                        <select name="salary_period" value={salaryPeriod} onChange={(event) => setSalaryPeriod(event.target.value)} aria-invalid={Boolean(errors.salary_period)}>
                          <option value="hourly">{t("hourly")}</option>
                          <option value="daily">{t("daily")}</option>
                          <option value="weekly">{t("weekly")}</option>
                          <option value="monthly">{t("monthly")}</option>
                          <option value="yearly">{t("yearly")}</option>
                        </select>
                        {errors.salary_period?.[0] ? <small role="alert">{errors.salary_period[0]}</small> : null}
                      </label> : null}
                      {locales.map((item) => <div className="wide rich-text-field" key={item}>
                        <span>{t("localizedDescription", { language: t(`languages.${item}`) })}</span>
                        <RichTextEditor dir={item === "en" ? "ltr" : "rtl"} value={translations[item].description} onChange={(value) => setTranslations((current) => ({ ...current, [item]: { ...current[item], description: value } }))} />
                        {errors[`translations.${item}.description`]?.[0] ? <small role="alert">{errors[`translations.${item}.description`][0]}</small> : null}
                      </div>)}
                      <div className="wide posting-options">
                        <label className="phone-visibility">
                          <input
                            type="checkbox"
                            checked={phoneVisible}
                            onChange={(event) => setPhoneVisible(event.target.checked)}
                          />
                          {t("phoneVisible")}
                        </label>
                        <label className="phone-visibility">
                          <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
                          {t("urgentListing")}
                        </label>
                      </div>
                      <div className="wide">
                        <ListingLocationPicker value={location} onChange={updateLocation} />
                      </div>
                      <div className="wide">
                        <DynamicFormRenderer
                          fields={schema.fields}
                          sections={schema.sections}
                          values={values}
                          errors={errors}
                          onChange={(code, value) =>
                            setValues((current) => ({
                              ...current,
                              [code]: value,
                            }))
                          }
                        />
                      </div>
                      {draftId ? (
                        <section className="wide listing-timeline" aria-labelledby="listing-history-title">
                          <h3 id="listing-history-title">{t("historyTitle")}</h3>
                          {history.slice(0, historyExpanded ? undefined : 5)
                            .map((item) => (
                              <article key={`${item.kind}-${item.id}`}>
                                <b>{((item.kind === "status" ? item.to_status : item.decision) ?? "").replaceAll("_", " ")}</b>
                                <small>{new Date(item.created_at).toLocaleString()}</small>
                                {item.reason ?? item.notes ?? item.reason_code ? <span>{item.reason ?? item.notes ?? item.reason_code}</span> : null}
                              </article>
                            ))}
                          {historyLoading ? <p>{t("loadingHistory")}</p> : null}
                          {historyError ? <p role="alert">{historyError} <button type="button" onClick={() => void loadHistory(draftId)}>{t("retryHistory")}</button></p> : null}
                          <div className="listing-history-actions">
                            {historyCursor ? <button type="button" onClick={() => void loadHistory(draftId, historyCursor)}>{t("showMoreHistory")}</button> : null}
                            {historyPages.length ? <button type="button" onClick={showLessHistory}>{t("showLessHistory")}</button> : null}
                          </div>
                        </section>
                      ) : null}
                      <div className="wide media-upload">
                        <label>{t("media")}</label>
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addMedia} />
                        <div className="media-preview">
                          {media.map((item) => (
                            <figure key={item.preview}>
                              <img src={item.preview} alt={"file" in item ? item.file.name : item.name} />
                               <button type="button" onClick={() => {
                                 if ("id" in item) setRemovedMediaIds((current) => [...current, item.id]);
                                 setMedia((current) => current.filter((candidate) => candidate !== item));
                               }}>{t("removeMedia")}</button>
                              <small>{item.status}</small>
                            </figure>
                          ))}
                        </div>
                      </div>
                      <button className="wide submit-listing" type="submit" disabled={loading}>
                        {loading ? t("submitting") : t("submit")}
                      </button>
                      {draftStatus !== "idle" ? <small role="status">{t(`draft.${draftStatus}`)}</small> : null}
                      {message ? (
                        <p role={listing ? "status" : "alert"}>
                          {message}
                          {listing
                            ? ` ${t("listingId", { id: listing.id })}`
                            : ""}
                        </p>
                      ) : null}
                    </form>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
