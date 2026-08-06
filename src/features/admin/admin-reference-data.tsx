"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ReactSelect from "react-select";
import { apiClient, ApiError } from "@/shared/lib/api";
import { adminPermissions } from "@/features/auth/permissions";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { clientLocale, type AppLocale } from "@/shared/i18n/config";
import { formatCurrency, formatDateTime } from "@/shared/lib/formatting/locale";
import { Button, Dialog, Input, Select, Toast } from "@/shared/ui";
import { ForbiddenState } from "@/shared/ui/feedback";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Landmark,
  MapPinned,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { LaravelCursorPagination } from "@/shared/types/api";
import styles from "./admin-reference-data.module.css";

type Section = "locations" | "currencies" | "exchange-rates";
type Translation = { locale: "en" | "fa" | "ps"; name: string };
type Area = {
  id: number;
  parent_id: number | null;
  country_code: string;
  type: string;
  slug: string;
  is_active: boolean;
  translations: Translation[];
};
type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_default: boolean;
  is_active: boolean;
};
type Rate = {
  id: number;
  base_currency_id: number;
  quote_currency_id: number;
  rate: string;
  source: string;
  effective_at: string;
  base: Currency;
  quote: Currency;
};
type Notice = { title: string; message?: string; tone: "success" | "danger" };
type EditorLabels = Record<
  | "add"
  | "edit"
  | "save"
  | "cancel"
  | "parent"
  | "noParent"
  | "countryCode"
  | "type"
  | "slug"
  | "englishName"
  | "dariName"
  | "pashtoName"
  | "code"
  | "name"
  | "symbol"
  | "decimalPlaces"
  | "defaultCurrency"
  | "active"
  | "baseCurrency"
  | "quoteCurrency"
  | "rate"
  | "source"
  | "effectiveAt"
  | "selectCurrency"
  | "searchParents",
  string
>;

const paths: Record<Section, string> = {
  locations: "/admin/api/v1/locations",
  currencies: "/admin/api/v1/currencies",
  "exchange-rates": "/admin/api/v1/exchange-rates",
};
const icons = {
  locations: MapPinned,
  currencies: Landmark,
  "exchange-rates": ArrowLeftRight,
} as const;
const pageSize = 10;

function cursorPath(
  path: string,
  cursor: string | null,
  perPage = pageSize,
  filters: Record<string, string> = {},
): string {
  const query = new URLSearchParams({ per_page: String(perPage) });
  if (cursor) query.set("cursor", cursor);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `${path}?${query}`;
}

export function AdminReferenceData({ section }: { section: Section }) {
  const { can } = useAuth();
  const [items, setItems] = useState<(Area | Currency | Rate)[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [parentAreas, setParentAreas] = useState<Area[]>([]);
  const [page, setPage] = useState<LaravelCursorPagination<
    Area | Currency | Rate
  > | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilterState] = useState<Record<string, string>>({});
  const setFilters = (value: React.SetStateAction<Record<string, string>>) => {
    setOffset(0);
    setCursor(null);
    setFilterState(value);
  };
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Area | Currency | Rate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const locale = clientLocale() as AppLocale;
  const t = useTranslations("adminReference");
  const formT = useTranslations("adminForm");
  const authorizationT = useTranslations("adminAuthorization");
  const viewPermission =
    section === "locations"
      ? adminPermissions.settingsManage
      : adminPermissions.currencies;
  const managePermission =
    section === "locations"
      ? adminPermissions.settingsManage
      : adminPermissions.currenciesManage;
  const mayManage = can(managePermission);
  const Icon = icons[section];
  const title = t(section === "exchange-rates" ? "exchangeRates" : section);
  const description = t(
    section === "locations"
      ? "locationDescription"
      : section === "currencies"
        ? "currencyDescription"
        : "rateDescription",
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      void Promise.all([
        apiClient.request<{
          data: LaravelCursorPagination<Area | Currency | Rate>;
          meta: { total: number };
        }>(cursorPath(paths[section], cursor, pageSize, filters)),
        section === "exchange-rates"
          ? apiClient.request<{ data: LaravelCursorPagination<Currency> }>(
              cursorPath("/admin/api/v1/currencies", null, 100),
            )
          : Promise.resolve(null),
        section === "locations"
          ? apiClient.request<{ data: LaravelCursorPagination<Area> }>(
              cursorPath("/admin/api/v1/locations", null, 100),
            )
          : Promise.resolve(null),
      ])
        .then(([data, currencyData, locationData]) => {
          setItems(data.data.data);
          setPage(data.data);
          setTotal(data.meta.total);
          setCurrencies(currencyData?.data.data ?? []);
          setParentAreas(locationData?.data.data ?? []);
        })
        .catch(setLoadError)
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [cursor, filters, refreshKey, section]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const remove = async () => {
    if (!deleting || !mayManage) return;
    try {
      await apiClient.request(`${paths[section]}/${deleting.id}`, {
        method: "DELETE",
      });
      setEditing(null);
      setDeleting(null);
      setOffset(0);
      setCursor(null);
      setRefreshKey((key) => key + 1);
      setNotice({
        title: t("deleted", { item: title }),
        message: t("removed", { name: deleting.name }),
        tone: "success",
      });
    } catch (reason) {
      const message =
        reason instanceof ApiError
          ? reason.message
          : "Unable to delete the record.";
      setError(message);
      setNotice({
        title: t("deleteFailed"),
        message: t("operationFailed"),
        tone: "danger",
      });
    }
  };
  const save = async (body: Record<string, unknown>) => {
    if (!mayManage) return;
    setSaving(true);
    setError(null);
    const isExistingRecord = Boolean(editing?.id);
    try {
      await apiClient.request(
        isExistingRecord ? `${paths[section]}/${editing!.id}` : paths[section],
        { method: isExistingRecord ? "PATCH" : "POST", body },
      );
      setEditing(null);
      setOffset(0);
      setCursor(null);
      setRefreshKey((key) => key + 1);
      setNotice({
        title: t(isExistingRecord ? "updated" : "created", { item: title }),
        message: t("changesSaved"),
        tone: "success",
      });
    } catch (reason) {
      const message =
        reason instanceof ApiError
          ? reason.message
          : "Check the form and try again.";
      setError(message);
      setNotice({
        title: t("changesNotSaved"),
        message: t("operationFailed"),
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageGuard permission={viewPermission}>
        <div className={styles.empty}>{authorizationT("loading")}</div>
      </AdminPageGuard>
    );
  }

  if (loadError instanceof ApiError && loadError.status === 403) {
    return (
      <AdminPageGuard permission={viewPermission}>
        <ForbiddenState />
      </AdminPageGuard>
    );
  }

  if (loadError) {
    return (
      <AdminPageGuard permission={viewPermission}>
        <div className={styles.empty}>
          <p>
            {loadError instanceof ApiError
              ? loadError.message
              : authorizationT("loadFailed")}
          </p>
          <Button onClick={() => setRefreshKey((key) => key + 1)}>
            {authorizationT("retry")}
          </Button>
        </div>
      </AdminPageGuard>
    );
  }

  return (
    <AdminPageGuard permission={viewPermission}>
      <div className={styles.page}>
        {notice ? (
          <Toast
            title={notice.title}
            message={notice.message}
            tone={notice.tone}
            onDismiss={() => setNotice(null)}
          />
        ) : null}
        {mayManage ? (
          <Dialog
            open={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            title={formT("deleteTitle")}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDeleting(null)}>
                  {formT("deleteKeep")}
                </Button>
                <Button variant="danger" onClick={() => void remove()}>
                  {formT("deletePermanent")}
                </Button>
              </>
            }
          >
            <p className={styles.confirmation}>
              This will permanently delete <b>{deleting?.name}</b>. This action
              cannot be undone.
            </p>
          </Dialog>
        ) : null}
        <header className={styles.hero}>
          <div className={styles.heading}>
            <span className={styles.icon}>
              <Icon size={21} />
            </span>
            <div>
              <h1>{title}</h1>
              <small>{description}</small>
            </div>
          </div>
          {mayManage ? (
            <Button size="sm" onClick={() => setEditing({} as Area)}>
              <Plus size={16} />
              {t("add")} {title}
            </Button>
          ) : null}
        </header>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.layout}>
          <section className={styles.table}>
            <div className={styles.tableHeader}>
              <div>
                <h2>{title}</h2>
                  <p>{total} {total === 1 ? "item" : "items"}</p>
              </div>
            </div>
            <form
              className={styles.filters}
              onSubmit={(event) => {
                event.preventDefault();
                setOffset(0);
                setCursor(null);
                setRefreshKey((key) => key + 1);
              }}
            >
              <label className={styles.searchField}>
                <Search size={16} />
                <Input
                  type="search"
                  placeholder={`${t("search")} ${title}`}
                  value={filters.q ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                />
              </label>
              {section === "locations" ? (
                <Select
                  value={filters.type ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("allTypes")}</option>
                  {[
                    "country",
                    "province",
                    "city",
                    "district",
                    "neighborhood",
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              ) : null}
              {section === "exchange-rates" ? (
                <>
                  <Select
                    value={filters.base_currency_id ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        base_currency_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t("allBaseCurrencies")}</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.code}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={filters.quote_currency_id ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        quote_currency_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t("allQuoteCurrencies")}</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.code}
                      </option>
                    ))}
                  </Select>
                </>
              ) : null}
              {section !== "exchange-rates" ? (
                <Select
                  value={filters.is_active ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      is_active: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="1">{t("active")}</option>
                  <option value="0">{t("inactive")}</option>
                </Select>
              ) : null}
              <Button size="sm" type="submit">
                <SlidersHorizontal size={15} />
                {t("apply")}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  setFilters({});
                  setOffset(0);
                  setCursor(null);
                  setRefreshKey((key) => key + 1);
                }}
              >
                {t("reset")}
              </Button>
            </form>
            {items.length === 0 ? (
              <div className={styles.empty}>
                <Icon size={28} />
                <b>{title}</b>
                <p>{formT("empty")}</p>
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Count</th>
                      <th>{t("name")}</th>
                      <th>{t("details")}</th>
                      {mayManage ? (
                        <th>
                          <span className={styles.actionsLabel}>
                            {t("actions")}
                          </span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <Row
                        key={item.id}
                        count={offset + index + 1}
                        section={section}
                        item={item}
                        locale={locale}
                        onEdit={() => setEditing(item)}
                        onDelete={(name) => setDeleting({ id: item.id, name })}
                        editLabel={t("edit")}
                        deleteLabel={t("delete")}
                        mayManage={mayManage}
                      />
                    ))}
                  </tbody>
                </table>
                <nav
                  className={styles.cursorNav}
                  aria-label={`${title} pagination`}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!page?.prev_cursor}
                    onClick={() => { setOffset((value) => Math.max(0, value - pageSize)); setCursor(page?.prev_cursor ?? null); }}
                  >
                    <ArrowLeft size={16} />
                    {t("newer")}
                  </Button>
                  <span>{total} items</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!page?.next_cursor}
                    onClick={() => { setOffset((value) => value + items.length); setCursor(page?.next_cursor ?? null); }}
                  >
                    {t("older")}
                    <ArrowRight size={16} />
                  </Button>
                </nav>
              </>
            )}
          </section>
          {mayManage && editing ? (
            <Editor
              key={editing.id ?? "new"}
              section={section}
              item={editing}
              areas={parentAreas}
              currencies={currencies}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={save}
              labels={{
                add: t("add"),
                edit: t("edit"),
                save: t("save"),
                cancel: t("cancel"),
                parent: formT("parent"),
                noParent: formT("noParent"),
                countryCode: formT("countryCode"),
                type: formT("type"),
                slug: formT("slug"),
                englishName: formT("englishName"),
                dariName: formT("dariName"),
                pashtoName: formT("pashtoName"),
                code: formT("code"),
                name: formT("name"),
                symbol: formT("symbol"),
                decimalPlaces: formT("decimalPlaces"),
                defaultCurrency: formT("defaultCurrency"),
                active: t("active"),
                baseCurrency: formT("baseCurrency"),
                quoteCurrency: formT("quoteCurrency"),
                rate: formT("rate"),
                source: formT("source"),
                effectiveAt: formT("effectiveAt"),
                selectCurrency: formT("selectCurrency"),
                searchParents: formT("searchParents"),
              }}
              locale={locale}
            />
          ) : (
            <aside className={styles.hint}>
              <Icon size={21} />
              <b>{formT("sideTitle")}</b>
              <p>{formT("sideDetail")}</p>
            </aside>
          )}
        </div>
      </div>
    </AdminPageGuard>
  );
}

function Row({
  count,
  section,
  item,
  locale,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  mayManage,
}: {
  count: number;
  section: Section;
  item: Area | Currency | Rate;
  locale: AppLocale;
  onEdit: () => void;
  onDelete: (name: string) => void;
  editLabel: string;
  deleteLabel: string;
  mayManage: boolean;
}) {
  const name =
    "translations" in item
      ? (item.translations.find((t) => t.locale === locale)?.name ??
        item.translations.find((t) => t.locale === "en")?.name ??
        item.slug)
      : "code" in item
        ? `${item.code} - ${item.name}`
        : `${item.base.code}/${item.quote.code}`;
  const detail =
    section === "locations"
      ? `${(item as Area).type} · ${(item as Area).country_code}`
      : section === "currencies"
        ? `${(item as Currency).symbol} · ${(item as Currency).decimal_places} decimals`
        : `${formatCurrency(Number((item as Rate).rate), (item as Rate).quote.code, locale, (item as Rate).quote.decimal_places)} · ${formatDateTime((item as Rate).effective_at, locale)}`;
  return (
    <tr>
      <td data-label="Count">{count}</td>
      <td data-label="Name">
        <b>{name}</b>
      </td>
      <td data-label="Details">{detail}</td>
      {mayManage ? (
        <td data-label="Actions">
          <span className={styles.rowActions}>
            <button
              type="button"
              aria-label={`${editLabel} ${name}`}
              title={editLabel}
              onClick={onEdit}
            >
              <Pencil size={15} />
              <span>{editLabel}</span>
            </button>
            <button
              type="button"
              aria-label={`${deleteLabel} ${name}`}
              title={deleteLabel}
              className={styles.delete}
              onClick={() => onDelete(name)}
            >
              <Trash2 size={15} />
              <span>{deleteLabel}</span>
            </button>
          </span>
        </td>
      ) : null}
    </tr>
  );
}

function Editor({
  section,
  item,
  areas,
  currencies,
  saving,
  onCancel,
  onSave,
  labels,
  locale,
}: {
  section: Section;
  item: Area | Currency | Rate;
  areas: Area[];
  currencies: Currency[];
  saving: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  labels: EditorLabels;
  locale: AppLocale;
}) {
  const area = "country_code" in item ? item : null;
  const currency = "code" in item ? item : null;
  const rate = "rate" in item ? item : null;
  const parentOptions = areas
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({
      value: String(candidate.id),
      label:
        candidate.translations.find(
          (translation) => translation.locale === locale,
        )?.name ??
        candidate.translations.find(
          (translation) => translation.locale === "en",
        )?.name ??
        candidate.slug,
    }));
  const [form, setForm] = useState<Record<string, string | boolean>>(() => {
    if (area)
      return {
        parent_id: area.parent_id?.toString() ?? "",
        country_code: area.country_code,
        type: area.type,
        slug: area.slug,
        en: area.translations.find((t) => t.locale === "en")?.name ?? "",
        fa: area.translations.find((t) => t.locale === "fa")?.name ?? "",
        ps: area.translations.find((t) => t.locale === "ps")?.name ?? "",
        is_active: area.is_active,
      } as Record<string, string | boolean>;
    if (currency)
      return {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: String(currency.decimal_places),
        is_default: currency.is_default,
        is_active: currency.is_active,
      } as Record<string, string | boolean>;
    if (rate)
      return {
        base_currency_id: String(rate.base_currency_id),
        quote_currency_id: String(rate.quote_currency_id),
        rate: rate.rate,
        source: rate.source,
        effective_at: rate.effective_at.slice(0, 16),
      } as Record<string, string | boolean>;
    if (section === "locations")
      return {
        parent_id: "",
        country_code: "AF",
        type: "country",
        slug: "",
        en: "",
        fa: "",
        ps: "",
        is_active: true,
      } as Record<string, string | boolean>;
    if (section === "currencies")
      return {
        code: "",
        name: "",
        symbol: "",
        decimal_places: "2",
        is_default: false,
        is_active: true,
      } as Record<string, string | boolean>;
    return {
      base_currency_id: "",
      quote_currency_id: "",
      rate: "",
      source: "manual",
      effective_at: "",
    } as Record<string, string | boolean>;
  });
  const change = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (section === "locations")
      onSave({
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        country_code: String(form.country_code).toUpperCase(),
        type: form.type,
        slug: form.slug,
        is_active: form.is_active,
        translations: (["en", "fa", "ps"] as const)
          .filter((locale) => form[locale])
          .map((locale) => ({ locale, name: form[locale] })),
      });
    else if (section === "currencies")
      onSave({
        ...form,
        code: String(form.code).toUpperCase(),
        decimal_places: Number(form.decimal_places),
      });
    else
      onSave({
        ...form,
        base_currency_id: Number(form.base_currency_id),
        quote_currency_id: Number(form.quote_currency_id),
        effective_at: new Date(String(form.effective_at)).toISOString(),
      });
  };
  return (
    <form className={styles.editor} onSubmit={submit}>
      <h2>{item.id ? labels.edit : labels.add}</h2>
      {section === "locations" ? (
        <>
          <label>
            {labels.parent}
            <ReactSelect
              className={styles.searchableSelect}
              classNamePrefix="admin-select"
              isClearable
              isRtl={locale !== "en"}
              options={parentOptions}
              placeholder={labels.searchParents}
              noOptionsMessage={() => labels.noParent}
              value={
                parentOptions.find(
                  (option) => option.value === String(form.parent_id),
                ) ?? null
              }
              onChange={(option) => change("parent_id", option?.value ?? "")}
            />
          </label>
          <label>
            {labels.countryCode}
            <Input
              required
              maxLength={2}
              value={String(form.country_code)}
              onChange={(e) => change("country_code", e.target.value)}
            />
          </label>
          <label>
            {labels.type}
            <Select
              value={String(form.type)}
              onChange={(e) => change("type", e.target.value)}
            >
              {["country", "province", "city", "district", "neighborhood"].map(
                (type) => (
                  <option key={type}>{type}</option>
                ),
              )}
            </Select>
          </label>
          <label>
            {labels.slug}
            <Input
              required
              value={String(form.slug)}
              onChange={(e) => change("slug", e.target.value)}
            />
          </label>
          {(["en", "fa", "ps"] as const).map((locale) => (
            <label key={locale}>
              {locale === "en"
                ? labels.englishName
                : locale === "fa"
                  ? labels.dariName
                  : labels.pashtoName}
              <Input
                required={locale === "en"}
                value={String(form[locale])}
                onChange={(e) => change(locale, e.target.value)}
              />
            </label>
          ))}
        </>
      ) : section === "currencies" ? (
        <>
          <label>
            {labels.code}
            <Input
              required
              maxLength={3}
              value={String(form.code)}
              onChange={(e) => change("code", e.target.value)}
            />
          </label>
          <label>
            {labels.name}
            <Input
              required
              value={String(form.name)}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <label>
            {labels.symbol}
            <Input
              required
              value={String(form.symbol)}
              onChange={(e) => change("symbol", e.target.value)}
            />
          </label>
          <label>
            {labels.decimalPlaces}
            <Input
              required
              type="number"
              min="0"
              max="6"
              value={String(form.decimal_places)}
              onChange={(e) => change("decimal_places", e.target.value)}
            />
          </label>{" "}
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.is_default)}
              onChange={(e) => change("is_default", e.target.checked)}
            />{" "}
            {labels.defaultCurrency}
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => change("is_active", e.target.checked)}
            />{" "}
            {labels.active}
          </label>
        </>
      ) : (
        <>
          <label>
            {labels.baseCurrency}
            <Select
              required
              value={String(form.base_currency_id)}
              onChange={(e) => change("base_currency_id", e.target.value)}
            >
              <option value="">{labels.selectCurrency}</option>
              {currencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code}
                </option>
              ))}
            </Select>
          </label>
          <label>
            {labels.quoteCurrency}
            <Select
              required
              value={String(form.quote_currency_id)}
              onChange={(e) => change("quote_currency_id", e.target.value)}
            >
              <option value="">{labels.selectCurrency}</option>
              {currencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code}
                </option>
              ))}
            </Select>
          </label>
          <label>
            {labels.rate}
            <Input
              required
              type="number"
              min="0.000000000001"
              step="any"
              value={String(form.rate)}
              onChange={(e) => change("rate", e.target.value)}
            />
          </label>
          <label>
            {labels.source}
            <Input
              required
              value={String(form.source)}
              onChange={(e) => change("source", e.target.value)}
            />
          </label>
          <label>
            {labels.effectiveAt}
            <Input
              required
              type="datetime-local"
              value={String(form.effective_at)}
              onChange={(e) => change("effective_at", e.target.value)}
            />
          </label>
        </>
      )}
      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button loading={saving} type="submit">
          {labels.save}
        </Button>
      </div>
    </form>
  );
}
