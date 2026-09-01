"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Tags } from "lucide-react";
import { apiClient, ApiError, type FieldErrors } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { adminPermissions } from "@/features/auth/permissions";
import { Button, Dialog, Input, RichTextEditor, Select, Textarea, Toast } from "@/shared/ui";
import { useAuth } from "@/features/auth/auth-provider";
import type { CursorPaginatedApiResponse } from "@/shared/types/api";
import {
  categoryIconMap,
  categoryIconOptions,
} from "@/features/catalog/category-icons";

type View = "settings" | "pages" | "banners";
type RecordItem = Record<string, unknown> & { id: number };
type Uploads = { image: File | null; mobileImage: File | null };
type PageCursor = { next_cursor: string | null; prev_cursor: string | null };
type PageCursorResponse = CursorPaginatedApiResponse<RecordItem> & {
  meta: { total: number };
};
type Notice = { title: string; message: string; tone: "success" | "danger" };

const navigationLocations = [
  "header",
  "mobile",
  "footer_company",
  "footer_help",
  "footer_legal",
] as const;
const navigationLabels: Record<(typeof navigationLocations)[number], string> = {
  header: "Header",
  mobile: "Mobile menu",
  footer_company: "Footer company",
  footer_help: "Footer help",
  footer_legal: "Footer legal",
};
const endpoint: Record<View, string> = {
  settings: routes.api.admin.settings,
  pages: routes.api.admin.pages,
  banners: routes.api.admin.banners,
};
const permission: Record<View, string> = {
  settings: adminPermissions.settings,
  pages: adminPermissions.pages,
  banners: adminPermissions.banners,
};
const managePermission: Record<View, string> = {
  settings: adminPermissions.settingsManage,
  pages: adminPermissions.pagesManage,
  banners: adminPermissions.bannersManage,
};

function arrayPayload(payload: unknown): RecordItem[] {
  const data = (payload as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as RecordItem[];
  if (Array.isArray((data as { data?: unknown })?.data))
    return (data as { data: RecordItem[] }).data;
  return [];
}

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function bannerSchedule(item: RecordItem) {
  const format = (value: unknown) => {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const startsAt = format(item.starts_at);
  const endsAt = format(item.ends_at);
  if (!startsAt && !endsAt) return "Always active";
  return `${startsAt ?? "Any time"} - ${endsAt ?? "No end date"}`;
}

function PageIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filtered = categoryIconOptions.filter(({ name }) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  const Preview = Object.hasOwn(categoryIconMap, value)
    ? categoryIconMap[value]
    : Tags;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(value), 0);
    return () => window.clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <div className="admin-content-icon-picker" ref={pickerRef}>
      <label htmlFor="page-navigation-icon">Navigation icon (optional)</label>
      <div className="admin-content-icon-search">
        <Preview size={18} aria-hidden="true" />
        <input
          id="page-navigation-icon"
          value={query}
          placeholder="Search icons"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
      </div>
      {value ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
        >
          Remove icon
        </Button>
      ) : null}
      {open ? (
        <div className="admin-content-icon-results" role="listbox">
          {filtered.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={name === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(name);
                setQuery(name);
                setOpen(false);
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {name}
            </button>
          ))}
          {!filtered.length ? <small>No icons found.</small> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminContentManagement({ view }: { view: View }) {
  const { can } = useAuth();
  const [items, setItems] = useState<RecordItem[]>([]);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pagePagination, setPagePagination] = useState<PageCursor | null>(null);
  const [pageTotal, setPageTotal] = useState(0);
  const [bannerCursor, setBannerCursor] = useState<string | null>(null);
  const [bannerCursors, setBannerCursors] = useState<Array<string | null>>([null]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPagination, setBannerPagination] = useState<PageCursor | null>(null);
  const [bannerTotal, setBannerTotal] = useState(0);
  const [deletingPage, setDeletingPage] = useState<RecordItem | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "pages") {
        const query = new URLSearchParams({ per_page: "20" });
        if (pageCursor) query.set("cursor", pageCursor);
        const response = await apiClient.request<PageCursorResponse>(
          `${endpoint.pages}?${query}`,
        );
        setItems(response.data.data);
        setPagePagination(response.data);
        setPageTotal(response.meta.total);
      } else if (view === "banners") {
        const query = new URLSearchParams({ per_page: "20" });
        if (bannerCursor) query.set("cursor", bannerCursor);
        const response = await apiClient.request<PageCursorResponse>(
          `${endpoint.banners}?${query}`,
        );
        setItems(response.data.data);
        setBannerPagination(response.data);
        setBannerTotal(response.meta.total);
      } else {
        setItems(arrayPayload(await apiClient.request(endpoint[view])));
        setPagePagination(null);
        setPageTotal(0);
      }
    } catch (reason) {
      setError(message(reason, "Content could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [bannerCursor, pageCursor, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPageCursor(null);
      setPageCursors([null]);
      setPageIndex(0);
      setPagePagination(null);
      setPageTotal(0);
      setBannerCursor(null);
      setBannerCursors([null]);
      setBannerIndex(0);
      setBannerPagination(null);
      setBannerTotal(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = () =>
    setSelected(
      view === "pages"
        ? {
            id: 0,
            slug: "",
            status: "draft",
            navigation_locations: [],
            navigation_order: 0,
            icon: null,
            translations: [],
          }
        : {
            id: 0,
            placement: "home",
            target_url: "",
            is_active: true,
            sort_order: 0,
          },
    );
  const save = async (files?: Uploads) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await apiClient.csrfCookie();
      const { id, ...body } = selected;
      const updating = Boolean(id);
      if (view === "settings") {
        await apiClient.request(
          `${endpoint.settings}/${encodeURIComponent(String(body.group_name))}/${encodeURIComponent(String(body.setting_key))}`,
          {
            method: "PUT",
            body: { value: body.value, is_public: Boolean(body.is_public) },
          },
        );
      } else if (view === "banners") {
        const form = new FormData();
        for (const [key, value] of Object.entries(body))
          if (value !== null && value !== undefined && value !== "")
            form.append(key, String(value));
        form.set("placement", "home");
        form.set("is_active", body.is_active ? "1" : "0");
        if (id) form.set("_method", "PATCH");
        if (files?.image) form.set("image", files.image);
        if (files?.mobileImage) form.set("mobile_image", files.mobileImage);
        await apiClient.request(
          id ? routes.api.admin.banner(id) : endpoint.banners,
          { method: "POST", body: form },
        );
      } else {
        const translations = Array.isArray(body.translations)
          ? body.translations.filter(
              (translation) =>
                translation &&
                typeof translation === "object" &&
                "title" in translation &&
                "content" in translation &&
                String(translation.title).trim() &&
                String(translation.content).trim(),
            )
          : [];
        await apiClient.request(
          id ? routes.api.admin.page(id) : endpoint.pages,
          { method: id ? "PATCH" : "POST", body: { ...body, translations } },
        );
      }
      setSelected(null);
      if (view === "pages") {
        setNotice({
          title: updating ? "Page updated" : "Page created",
          message: "Your changes have been saved.",
          tone: "success",
        });
      }
      await load();
    } catch (reason) {
      setError(message(reason, "Changes could not be saved."));
      if (reason instanceof ApiError) setFieldErrors(reason.errors);
      if (view === "pages") {
        setNotice({
          title: "Page could not be saved",
          message: message(reason, "Please review the form and try again."),
          tone: "danger",
        });
      }
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: number) => {
    if (view !== "pages" && !window.confirm("Delete this item?")) return;
    try {
      await apiClient.csrfCookie();
      await apiClient.request(
        view === "pages"
          ? routes.api.admin.page(id)
          : routes.api.admin.banner(id),
        { method: "DELETE" },
      );
      setDeletingPage(null);
      if (view === "pages") {
        setNotice({
          title: "Page deleted",
          message: "The page has been removed.",
          tone: "success",
        });
      }
      await load();
    } catch (reason) {
      setError(message(reason, "Item could not be deleted."));
      if (view === "pages") {
        setNotice({
          title: "Page could not be deleted",
          message: message(reason, "Please try again."),
          tone: "danger",
        });
      }
    }
  };
  const title =
    view === "settings" ? "Settings" : view === "pages" ? "Pages" : "Banners";
  const canManage = can(managePermission[view]);
  const HeaderIcon = view === "pages" ? FileText : view === "banners" ? ImageIcon : null;
  const pageStart = pageIndex * 20 + 1;
  const pageEnd = pageStart + items.length - 1;
  const bannerStart = bannerIndex * 20 + 1;
  const bannerEnd = bannerStart + items.length - 1;
  const previousPage = () => {
    if (!pageIndex) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    setPageCursor(pageCursors[previousIndex]);
  };
  const nextPage = () => {
    if (!pagePagination?.next_cursor) return;
    const nextIndex = pageIndex + 1;
    const cursors = [...pageCursors.slice(0, nextIndex), pagePagination.next_cursor];
    setPageCursors(cursors);
    setPageIndex(nextIndex);
    setPageCursor(pagePagination.next_cursor);
  };
  const previousBanner = () => {
    if (!bannerIndex) return;
    const previousIndex = bannerIndex - 1;
    setBannerIndex(previousIndex);
    setBannerCursor(bannerCursors[previousIndex]);
  };
  const nextBanner = () => {
    if (!bannerPagination?.next_cursor) return;
    const nextIndex = bannerIndex + 1;
    setBannerCursors([...bannerCursors.slice(0, nextIndex), bannerPagination.next_cursor]);
    setBannerIndex(nextIndex);
    setBannerCursor(bannerPagination.next_cursor);
  };

  return (
    <AdminPageGuard permission={permission[view]}>
      <section className={`admin-content-manager admin-content-manager--${view}`}>
        {notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}
        <header>
          <div className="admin-content-heading">
            {HeaderIcon ? <span className="admin-content-heading-icon"><HeaderIcon size={21} /></span> : null}
            <div>
              <h1>{title}</h1>
              <p>
                {view === "settings"
                  ? "Manage application settings and their public visibility."
                  : `Manage ${title.toLowerCase()} shown to visitors.`}
              </p>
            </div>
          </div>
          {canManage && view !== "settings" ? (
            <Button onClick={create}>Add {view.slice(0, -1)}</Button>
          ) : null}
        </header>
        {error ? (
          <p role="alert" className="admin-content-error">
            {error}
          </p>
        ) : null}
        <Dialog
          open={(view === "pages" || view === "banners") && Boolean(selected && canManage)}
          onClose={() => setSelected(null)}
          title={`${selected?.id ? "Edit" : "New"} ${view.slice(0, -1)}`}
          className="admin-content-editor-dialog"
        >
          {selected && canManage ? (
            <Editor
              view={view}
              item={selected}
              errors={fieldErrors}
              onChange={setSelected}
              onSave={save}
              onCancel={() => setSelected(null)}
              saving={saving}
            />
          ) : null}
        </Dialog>
        <Dialog
          open={Boolean(deletingPage)}
          onClose={() => setDeletingPage(null)}
          title="Delete page"
          footer={<><Button type="button" variant="ghost" onClick={() => setDeletingPage(null)}>Keep page</Button><Button type="button" variant="danger" onClick={() => deletingPage && void remove(deletingPage.id)}>Delete page</Button></>}
        >
          <p className="admin-content-delete-message">This will delete <b>{String(deletingPage?.slug ?? "this page")}</b>. This action cannot be undone.</p>
        </Dialog>
        {loading ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : (
          <div className={`admin-content-grid${view === "pages" || view === "banners" ? " admin-content-grid--single" : ""}`}>
            <div className="admin-content-list">
              {view === "pages" ? (
                <>
                  <div className="admin-content-pages-list-header">
                    <div>
                      <h2>All pages</h2>
                      <p>{pageTotal} {pageTotal === 1 ? "item" : "items"}</p>
                    </div>
                  </div>
                  {items.length ? (
                    <>
                    <div className="admin-content-pages-table">
                      <table>
                        <thead><tr><th>Count</th><th>Page</th><th>Status</th><th>Linked in</th>{canManage ? <th><span className="admin-content-actions-label">Actions</span></th> : null}</tr></thead>
                        <tbody>{items.map((item, index) => {
                          const translations = Array.isArray(item.translations) ? item.translations as Array<Record<string, unknown>> : [];
                          const title = translations.find((translation) => translation.locale === "en")?.title ?? translations[0]?.title;
                          const locations = Array.isArray(item.navigation_locations) ? item.navigation_locations.filter((location): location is keyof typeof navigationLabels => typeof location === "string" && location in navigationLabels) : [];
                          const status = item.status === "published" ? "Published" : "Draft";
                          return <tr key={item.id}><td>{pageStart + index}</td><td><b>{String(title || item.slug)}</b><small>/{String(item.slug)}</small></td><td><span className={`admin-content-status admin-content-status--${String(item.status ?? "draft")}`}>{status}</span></td><td>{locations.length ? <span className="admin-content-placement-chips">{locations.map((location) => <span key={location}>{navigationLabels[location]}</span>)}</span> : <span className="admin-content-not-linked">Not linked</span>}</td>{canManage ? <td><span className="admin-content-row-actions"><Button size="sm" variant="secondary" onClick={() => { setFieldErrors({}); setSelected(item); }}>Edit</Button><Button size="sm" variant="danger" onClick={() => setDeletingPage(item)}>Delete</Button></span></td> : null}</tr>;
                        })}</tbody>
                      </table>
                    </div>
                    <nav className="admin-content-cursor-controls" aria-label="Pages pagination">
                      <span>{`Showing ${pageStart}-${pageEnd}`}</span>
                      <div><Button type="button" size="sm" variant="ghost" disabled={loading || pageIndex === 0} onClick={previousPage}>Previous</Button><Button type="button" size="sm" variant="ghost" disabled={loading || !pagePagination?.next_cursor} onClick={nextPage}>Next</Button></div>
                    </nav>
                    </>
                  ) : <p>No pages yet.</p>}
                </>
              ) : view === "banners" ? (
                <>
                  <div className="admin-content-pages-list-header">
                    <div><h2>All banners</h2><p>{bannerTotal} {bannerTotal === 1 ? "item" : "items"}</p></div>
                  </div>
                  {items.length ? <>
                    <div className="admin-content-pages-table admin-content-banners-table">
                      <table>
                        <thead><tr><th>Count</th><th>Placement</th><th>Status</th><th>Order</th><th>Schedule</th>{canManage ? <th><span className="admin-content-actions-label">Actions</span></th> : null}</tr></thead>
                        <tbody>{items.map((item, index) => <tr key={item.id}><td>{bannerStart + index}</td><td><b>Home page</b></td><td><span className={`admin-content-status admin-content-status--${item.is_active ? "active" : "inactive"}`}>{item.is_active ? "Active" : "Inactive"}</span></td><td>{String(item.sort_order ?? 0)}</td><td>{bannerSchedule(item)}</td>{canManage ? <td><span className="admin-content-row-actions"><Button size="sm" variant="secondary" onClick={() => { setFieldErrors({}); setSelected(item); }}>Edit</Button><Button size="sm" variant="danger" onClick={() => void remove(item.id)}>Delete</Button></span></td> : null}</tr>)}</tbody>
                      </table>
                    </div>
                    <nav className="admin-content-cursor-controls" aria-label="Banners pagination"><span>{`Showing ${bannerStart}-${bannerEnd}`}</span><div><Button type="button" size="sm" variant="ghost" disabled={loading || bannerIndex === 0} onClick={previousBanner}>Previous</Button><Button type="button" size="sm" variant="ghost" disabled={loading || !bannerPagination?.next_cursor} onClick={nextBanner}>Next</Button></div></nav>
                  </> : <p>No banners yet.</p>}
                </>
              ) : items.length ? (
                items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <b>
                        {String(
                          item.slug ??
                            item.setting_key ??
                            item.placement ??
                            item.id,
                        )}
                      </b>
                      <small>
                        {String(
                          item.status ??
                            item.group_name ??
                            (item.is_active ? "active" : "inactive"),
                        )}
                      </small>
                    </div>
                    {canManage ? (
                      <span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFieldErrors({});
                            setSelected(item);
                          }}
                        >
                          Edit
                        </Button>
                        {view !== "settings" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => void remove(item.id)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </span>
                    ) : null}
                  </article>
                ))
              ) : (
                <p>No {title.toLowerCase()} yet.</p>
              )}
            </div>
            {selected && canManage && view !== "pages" && view !== "banners" ? (
              <Editor
                view={view}
                item={selected}
                errors={fieldErrors}
                onChange={setSelected}
                onSave={save}
                onCancel={() => setSelected(null)}
                saving={saving}
              />
            ) : view === "pages" || view === "banners" ? null : (
              <aside className="admin-content-empty">
                {canManage
                  ? "Select an item to edit it."
                  : "You have view-only access."}
              </aside>
            )}
          </div>
        )}
      </section>
    </AdminPageGuard>
  );
}

function Editor({
  view,
  item,
  errors,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  view: View;
  item: RecordItem;
  errors: FieldErrors;
  onChange: (item: RecordItem) => void;
  onSave: (files?: Uploads) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [image, setImage] = useState<File | null>(null);
  const [mobileImage, setMobileImage] = useState<File | null>(null);
  const set = (key: string, value: unknown) =>
    onChange({ ...item, [key]: value });
  const translations = Array.isArray(item.translations)
    ? (item.translations as Array<Record<string, string>>)
    : [];
  const locations = Array.isArray(item.navigation_locations)
    ? item.navigation_locations.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const fieldError = (name: string) =>
    errors[name]?.[0] ? (
      <small className="admin-content-field-error">{errors[name][0]}</small>
    ) : null;
  const toggleLocation = (location: string, checked: boolean) =>
    set(
      "navigation_locations",
      checked
        ? [...locations, location]
        : locations.filter((value) => value !== location),
    );

  return (
    <form
      className={`admin-content-editor admin-content-editor--${view}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ image, mobileImage });
      }}
    >
      <h2>
        {item.id ? "Edit" : "New"} {view.slice(0, -1)}
      </h2>
      {view === "settings" ? (
        <>
          <label>
            Group
            <Input value={String(item.group_name ?? "")} disabled />
          </label>
          <label>
            Key
            <Input value={String(item.setting_key ?? "")} disabled />
          </label>
          <label>
            Value
            <Textarea
              value={
                typeof item.value === "string"
                  ? item.value
                  : JSON.stringify(item.value ?? "")
              }
              onChange={(event) => set("value", event.target.value)}
            />
            {fieldError("value")}
          </label>
          <label className="admin-content-checkbox">
            <Input
              type="checkbox"
              checked={Boolean(item.is_public)}
              onChange={(event) => set("is_public", event.target.checked)}
            />
            Public setting
          </label>
          {fieldError("is_public")}
        </>
      ) : view === "pages" ? (
        <>
          <label>
            Slug
            <Input
              value={String(item.slug ?? "")}
              onChange={(event) => set("slug", event.target.value)}
              required
            />
            {fieldError("slug")}
          </label>
          <label>
            Status
            <Select
              value={String(item.status ?? "draft")}
              onChange={(event) => set("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
            {fieldError("status")}
          </label>
          <fieldset className="admin-content-navigation-locations">
            <legend>Show page link in</legend>
            <p>Choose every public navigation area where this page should appear.</p>
            <div>
              {navigationLocations.map((location) => (
                <label key={location} className="admin-content-checkbox">
                  <Input
                    type="checkbox"
                    checked={locations.includes(location)}
                    onChange={(event) =>
                      toggleLocation(location, event.target.checked)
                    }
                  />
                  {navigationLabels[location]}
                </label>
              ))}
            </div>
            {fieldError("navigation_locations")}
          </fieldset>
          <label>
            Link order
            <Input
              type="number"
              min="0"
              max="65535"
              value={String(item.navigation_order ?? 0)}
              onChange={(event) =>
                set(
                  "navigation_order",
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
            />
            {fieldError("navigation_order")}
          </label>
          <PageIconPicker
            value={typeof item.icon === "string" ? item.icon : ""}
            onChange={(icon) => set("icon", icon)}
          />
          {fieldError("icon")}
          {(["en", "fa", "ps"] as const).map((locale) => {
            const current = translations.find(
              (entry) => entry.locale === locale,
            ) ?? { locale, title: "", content: "" };
            const update = (key: string, value: string) =>
              set("translations", [
                ...translations.filter((entry) => entry.locale !== locale),
                { ...current, [key]: value },
              ]);
            return (
              <fieldset key={locale}>
                <legend>{locale.toUpperCase()}</legend>
                <label>
                  Title
                  <Input
                    value={current.title ?? ""}
                    onChange={(event) => update("title", event.target.value)}
                  />
                  {fieldError(`translations.${locale}.title`)}
                </label>
                <div className="admin-content-rich-field">
                  <span>Content</span>
                  <RichTextEditor
                    value={current.content ?? ""}
                    onChange={(value) => update("content", value)}
                  />
                  {fieldError(`translations.${locale}.content`)}
                </div>
              </fieldset>
            );
          })}
        </>
      ) : (
        <>
          <label>
            Placement
            <Input
              value="Home page"
              readOnly
              required
            />
            {fieldError("placement")}
          </label>
          <label>
            Image URL
            <Input
              value={String(item.image_path ?? "")}
              onChange={(event) => set("image_path", event.target.value)}
            />
            {fieldError("image_path")}
          </label>
          <label>
            Image upload
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            Mobile image URL
            <Input
              value={String(item.mobile_image_path ?? "")}
              onChange={(event) => set("mobile_image_path", event.target.value)}
            />
          </label>
          <label>
            Mobile image upload
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                setMobileImage(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label>
            Target URL
            <Input
              type="url"
              value={String(item.target_url ?? "")}
              onChange={(event) => set("target_url", event.target.value)}
            />
          </label>
          <label>
            Sort order
            <Input
              type="number"
              min="0"
              max="65535"
              value={String(item.sort_order ?? 0)}
              onChange={(event) =>
                set("sort_order", Number(event.target.value))
              }
              required
            />
            {fieldError("sort_order")}
          </label>
          <label className="admin-content-checkbox">
            <Input
              type="checkbox"
              checked={Boolean(item.is_active)}
              onChange={(event) => set("is_active", event.target.checked)}
            />
            Active
          </label>
          {fieldError("is_active")}
        </>
      )}
      <div className="admin-content-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
