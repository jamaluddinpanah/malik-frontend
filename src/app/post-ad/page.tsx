"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, apiClient, type ApiResponse } from "@/lib/api";
import { routes } from "@/lib/routes";
import { ProtectedRoute } from "@/presentation/auth/protected-route";
import { adminPermissions } from "@/domain/auth/permissions";
import { CategorySelector } from "@/features/catalog/category-selector";
import {
  CurrencySelector,
  type Currency,
} from "@/features/catalog/currency-selector";
import { DynamicFormRenderer } from "@/features/catalog/dynamic-form-renderer";
import type {
  ApiCategory,
  CategoryFormSchema,
  CategoryPath,
  DynamicFormValues,
} from "@/features/catalog/category-types";
import styles from "./post-ad.module.css";

type ListingResponse = { id: number; listing_number?: string; slug?: string };
type DraftStatus = "idle" | "saving" | "saved" | "failed";
type PendingMedia = { file: File; preview: string; status: "ready" | "uploading" | "uploaded" | "failed" };

export default function PostAd() {
  const t = useTranslations("postAd");
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [path, setPath] = useState<CategoryPath>([]);
  const [schema, setSchema] = useState<CategoryFormSchema | null>(null);
  const [values, setValues] = useState<DynamicFormValues>({});
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceType, setPriceType] = useState("fixed");
  const [price, setPrice] = useState("");
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [media, setMedia] = useState<PendingMedia[]>([]);

  async function selectCategory(next: ApiCategory, nextPath: CategoryPath) {
    setCategory(next);
    setPath(nextPath);
    setSchema(null);
    setValues({});
    setTitle("");
    setDescription("");
    setPriceType("fixed");
    setPrice("");
    setDraftId(null);
    setDraftStatus("idle");
    setMedia([]);
    setErrors({});
    setMessage("");
    setLoading(true);
    try {
      const response = await apiClient.request<ApiResponse<CategoryFormSchema>>(
        routes.api.categoryFormSchema(next.id),
        { cache: "no-store" },
      );
      setSchema(response.data);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("schemaError"));
    } finally {
      setLoading(false);
    }
  }

  const saveDraft = useCallback(async (): Promise<number | null> => {
    if (!category || !title.trim() || !description.trim()) return draftId;
    setDraftStatus("saving");
    try {
      await apiClient.csrfCookie();
      const body = {
        category_id: category.id,
        title: title.trim(),
        description: description.trim(),
        price_type: priceType,
        price: price ? Number(price) : null,
        currency_id: currency?.id ?? null,
        attributes: values,
      };
      const response = draftId
        ? await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listing(draftId), { method: "PATCH", body })
        : await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listings, { method: "POST", body });
      const id = response.data.id;
      setDraftId(id);
      setDraftStatus("saved");
      return id;
    } catch (error) {
      setDraftStatus("failed");
      throw error;
    }
  }, [category, currency, description, draftId, price, priceType, title, values]);

  useEffect(() => {
    if (!category || !title.trim() || !description.trim()) return;
    const timeout = window.setTimeout(() => void saveDraft().catch(() => undefined), 900);
    return () => window.clearTimeout(timeout);
  }, [category, description, saveDraft, title, values]);

  function addMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 12 - media.length);
    setMedia((current) => [
      ...current,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file), status: "ready" as const })),
    ]);
    event.target.value = "";
  }

  async function uploadMedia(id: number) {
    const pending = media.filter((item) => item.status === "ready" || item.status === "failed");
    if (!pending.length) return;
    setMedia((current) => current.map((item) => pending.includes(item) ? { ...item, status: "uploading" } : item));
    const body = new FormData();
    pending.forEach((item) => body.append("media[]", item.file));
    try {
      await apiClient.request(routes.api.listingMedia(id), { method: "POST", body });
      setMedia((current) => current.map((item) => pending.includes(item) ? { ...item, status: "uploaded" } : item));
    } catch (error) {
      setMedia((current) => current.map((item) => pending.includes(item) ? { ...item, status: "failed" } : item));
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
      const id = await saveDraft();
      if (!id) throw new Error("Draft could not be saved.");
      await uploadMedia(id);
      const response = await apiClient.request<ApiResponse<ListingResponse>>(routes.api.listingSubmit(id), { method: "POST" });
      setListing(response.data);
      setMessage(t("success"));
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        setMessage(error.status === 403 ? t("forbidden") : error.message);
      } else setMessage(t("error"));
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
                      <label>
                        {t("listingTitle")}
                        <input
                          name="title"
                          required
                          maxLength={255}
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          aria-invalid={Boolean(errors.title)}
                        />
                        {errors.title?.[0] ? (
                          <small role="alert">{errors.title[0]}</small>
                        ) : null}
                      </label>
                      <label>
                        {t("priceType")}
                        <select name="price_type" value={priceType} onChange={(event) => setPriceType(event.target.value)}>
                          <option value="fixed">{t("fixed")}</option>
                          <option value="negotiable">{t("negotiable")}</option>
                          <option value="contact">{t("contact")}</option>
                        </select>
                      </label>
                      <label>
                        {t("price")}
                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          value={price}
                          onChange={(event) => setPrice(event.target.value)}
                          aria-invalid={Boolean(errors.price)}
                        />
                        {errors.price?.[0] ? (
                          <small role="alert">{errors.price[0]}</small>
                        ) : null}
                      </label>
                      <label>
                        {t("currency")}
                        <CurrencySelector
                          value={currency?.id}
                          onChange={setCurrency}
                        />
                      </label>
                      <label className="wide">
                        {t("listingDescription")}
                        <textarea
                          name="description"
                          required
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          aria-invalid={Boolean(errors.description)}
                        />
                        {errors.description?.[0] ? (
                          <small role="alert">{errors.description[0]}</small>
                        ) : null}
                      </label>
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
                      <div className="wide media-upload">
                        <label>{t("media")}</label>
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addMedia} />
                        <div className="media-preview">
                          {media.map((item) => (
                            <figure key={item.preview}>
                              <img src={item.preview} alt={item.file.name} />
                              <button type="button" onClick={() => setMedia((current) => current.filter((candidate) => candidate !== item))}>{t("removeMedia")}</button>
                              <small>{item.status}</small>
                            </figure>
                          ))}
                        </div>
                      </div>
                      <button type="submit" disabled={loading}>
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
