"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ReactSelect from "react-select";
import { ChevronDown, ChevronRight, Tags } from "lucide-react";
import { AdminPageGuard } from "@/presentation/auth/admin-page-guard";
import { useAuth } from "@/presentation/auth/auth-provider";
import { adminPermissions } from "@/domain/auth/permissions";
import { clientLocale, type AppLocale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import {
  AdminRepository,
  type AdminAttribute,
  type AdminCategory,
  type AdminOption,
  type AdminSchema,
  type AdminSection,
} from "@/infrastructure/api/admin-repository";
import { Button, ConfirmationDialog, Toast } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/components/feedback";
import styles from "./admin-catalog.module.css";
import { categoryIconOptions, categoryIconMap } from "@/features/catalog/category-icons";

const repository = new AdminRepository();
type CatalogNotice = { title: string; tone: "success" | "danger" };

function categoryName(category: AdminCategory, locale: AppLocale) {
  return (
    category.translations?.find((item) => item.locale === locale)?.name ??
    category.translations?.find((item) => item.locale === "en")?.name ??
    category.slug
  );
}

function attributeName(attribute: AdminAttribute, locale: AppLocale) {
  return (
    attribute.translations?.find((item) => item.locale === locale)?.name ??
    attribute.translations?.find((item) => item.locale === "en")?.name ??
    attribute.code
  );
}

function categoryRows(
  categories: AdminCategory[],
  parentId: number | null = null,
  depth = 0,
): Array<{ category: AdminCategory; depth: number }> {
  return categories
    .filter((category) => category.parent_id === parentId)
    .flatMap((category) => [
      { category, depth },
      ...categoryRows(categories, category.id, depth + 1),
    ]);
}

function SearchableIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("adminCatalog");
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filtered = categoryIconOptions.filter(({ name }) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  const Preview = categoryIconMap[value] ?? Tags;

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
    <div className={styles.iconPicker} ref={pickerRef}>
      <label>{t("categoryIcon")}</label>
      <div className={styles.iconSearchRow}>
        <Preview size={18} />
        <input
          value={query}
          placeholder={t("searchIcons")}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          aria-label={t("searchIcons")}
        />
      </div>
      {open ? (
        <div className={styles.iconResults} role="listbox">
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
              <Icon size={17} />
              {name}
            </button>
          ))}
          {!filtered.length ? <small>{t("noIcons")}</small> : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value) ?? null;
  return (
    <ReactSelect
      className={styles.searchableSelect}
      classNamePrefix="catalog-select"
      isSearchable
      isDisabled={disabled}
      options={options}
      value={selected}
      placeholder={placeholder}
      onChange={(option) => onChange(option?.value ?? "")}
      menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 20 }) }}
    />
  );
}

function AdminCategoryTree({
  categories,
  locale,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}: {
  categories: AdminCategory[];
  locale: AppLocale;
  selectedId: number | null;
  expanded: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  const render = (parentId: number | null, depth: number) =>
    categories
      .filter((category) => category.parent_id === parentId)
      .map((category) => {
        const children = categories.filter((item) => item.parent_id === category.id);
        const isExpanded = expanded.has(category.id);
        return (
          <li className={styles.treeNode} key={category.id} role="treeitem" aria-expanded={children.length ? isExpanded : undefined} aria-selected={selectedId === category.id}>
            <div className={styles.treeRow}>
              {children.length ? (
                <button
                  className={styles.treeToggle}
                  type="button"
                  aria-label={isExpanded ? "Collapse category" : "Expand category"}
                  aria-expanded={isExpanded}
                  onClick={() => onToggle(category.id)}
                >
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              ) : (
                <span className={styles.treeTogglePlaceholder} />
              )}
              <button
                className={`${styles.treeItem} ${selectedId === category.id ? styles.selected : ""}`}
                type="button"
                onClick={() => onSelect(category.id)}
                style={{ "--depth": depth } as React.CSSProperties}
              >
                {category.icon && categoryIconMap[category.icon] ? (() => {
                  const Icon = categoryIconMap[category.icon];
                  return <Icon size={16} />;
                })() : null}
                <b>{categoryName(category, locale)}</b>
                <small>{category.slug}</small>
              </button>
            </div>
            {children.length && isExpanded ? (
              <ul className={styles.treeChildren} role="group">
                {render(category.id, depth + 1)}
              </ul>
            ) : null}
          </li>
        );
      });

  return <ul className={styles.tree} role="tree">{render(null, 0)}</ul>;
}

export function AdminCatalog() {
  const t = useTranslations("adminCatalog");
  const { can } = useAuth();
  const locale = clientLocale();
  const mayManage = can(adminPermissions.attributesManage);
  const mayManageCategories = can(adminPermissions.categoriesManage);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [schema, setSchema] = useState<AdminSchema | null>(null);
  const [assignmentId, setAssignmentId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [required, setRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [schemaError, setSchemaError] = useState<unknown>(null);
  const [notice, setNotice] = useState<CatalogNotice | null>(null);
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryParent, setCategoryParent] = useState("");
  const [categoryRoot, setCategoryRoot] = useState("goods");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [categoryNames, setCategoryNames] = useState({ en: "", fa: "", ps: "" });
  const [categoryDefaultExpanded, setCategoryDefaultExpanded] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(new Set());
  const [attributeCode, setAttributeCode] = useState("");
  const [attributeType, setAttributeType] = useState("string");
  const [attributeInput, setAttributeInput] = useState("text");
  const [attributeNames, setAttributeNames] = useState({ en: "", fa: "", ps: "" });
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [options, setOptions] = useState<AdminOption[]>([]);
  const [optionValue, setOptionValue] = useState("");
  const [optionSlug, setOptionSlug] = useState("");
  const [categoryVisibleCount, setCategoryVisibleCount] = useState(10);
  const [attributeVisibleCount, setAttributeVisibleCount] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<"category" | "attribute" | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<number | null>(null);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategorySlug("");
    setCategoryParent("");
    setCategoryRoot("goods");
    setCategoryIcon("");
    setCategoryNames({ en: "", fa: "", ps: "" });
    setCategoryDefaultExpanded(false);
  };

  const resetAttributeForm = () => {
    setEditingAttributeId(null);
    setAttributeCode("");
    setAttributeType("string");
    setAttributeInput("text");
    setAttributeNames({ en: "", fa: "", ps: "" });
  };

  const load = () => {
    setLoading(true);
    setError(null);
    setCategoryVisibleCount(10);
    setAttributeVisibleCount(10);
    void Promise.all([
      repository.categories(),
      repository.attributes(),
      repository.sections(),
    ])
      .then(([categoryPage, attributePage, sectionPage]) => {
        setCategories(categoryPage.data);
        setAttributes(attributePage.data);
        setSections(sectionPage.data);
        setSelectedId((current) => current ?? categoryPage.data[0]?.id ?? null);
        setExpandedCategoryIds((current) =>
          new Set([
            ...current,
            ...categoryPage.data
              .filter((category) => category.default_expanded)
              .map((category) => category.id),
          ]),
        );
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!selectedId) {
        setSchema(null);
        return;
      }
      setSchemaLoading(true);
      setSchemaError(null);
      void repository
        .schemaPreview(selectedId, locale)
        .then(setSchema)
        .catch(setSchemaError)
        .finally(() => setSchemaLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [locale, selectedId]);

  useEffect(() => {
    if (!selectedAttributeId) return;
    void repository
      .options(selectedAttributeId)
      .then((page) => setOptions(page.data))
      .catch(() => setOptions([]));
  }, [selectedAttributeId]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !assignmentId || !mayManage) return;
    setSaving(true);
    setNotice(null);
    try {
      await repository.assignCategoryAttribute(selectedId, {
        attribute_id: Number(assignmentId),
        section_id: sectionId ? Number(sectionId) : null,
        is_required: required,
        sort_order: Number(sortOrder) || 0,
      });
       setNotice({ title: t("saved"), tone: "success" });
      setAssignmentId("");
      setSchema(await repository.schemaPreview(selectedId, locale));
    } catch (reason) {
      setSchemaError(reason);
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mayManageCategories || !categorySlug.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const parentId = categoryParent ? Number(categoryParent) : null;
      const parent = categories.find((category) => category.id === parentId);
      const input = {
        slug: categorySlug.trim(),
        parent_id: parentId,
        root_type: parent?.root_type ?? categoryRoot,
        icon: parentId ? null : categoryIcon || null,
        default_expanded: categoryDefaultExpanded,
        translations: [
          { locale: "en", name: categoryNames.en },
          { locale: "fa", name: categoryNames.fa },
          { locale: "ps", name: categoryNames.ps },
        ],
        status: true,
        is_selectable: true,
        allow_listings: true,
      };
      if (editingCategoryId) {
        await repository.updateCategory(editingCategoryId, input);
      } else {
        await repository.createCategory(input);
      }
      resetCategoryForm();
       setNotice({ title: editingCategoryId ? t("categoryUpdated") : t("categoryCreated"), tone: "success" });
      load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const editCategory = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setCategorySlug(category.slug);
    setCategoryParent(category.parent_id ? String(category.parent_id) : "");
    setCategoryRoot(category.root_type ?? "goods");
    setCategoryIcon(category.icon ?? "");
    setCategoryDefaultExpanded(Boolean(category.default_expanded));
    setCategoryNames({
      en: category.translations?.find((item) => item.locale === "en")?.name ?? "",
      fa: category.translations?.find((item) => item.locale === "fa")?.name ?? "",
      ps: category.translations?.find((item) => item.locale === "ps")?.name ?? "",
    });
  };

  const deleteCategory = async () => {
    if (!selectedId || !mayManageCategories) return;
    setSaving(true);
    setNotice(null);
    try {
      await repository.deleteCategory(selectedId);
      setSelectedId(null);
      setDeleteTarget(null);
       setNotice({ title: t("categoryDeleted"), tone: "success" });
      load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const createAttribute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mayManage || !attributeCode.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const input = {
        code: attributeCode.trim(),
        data_type: attributeType,
        input_type: attributeInput,
        is_active: true,
        translations: [
          { locale: "en", name: attributeNames.en },
          { locale: "fa", name: attributeNames.fa },
          { locale: "ps", name: attributeNames.ps },
        ],
      };
      if (editingAttributeId) {
        await repository.updateAttribute(editingAttributeId, input);
      } else {
        await repository.createAttribute(input);
      }
      resetAttributeForm();
       setNotice({ title: editingAttributeId ? t("attributeUpdated") : t("attributeCreated"), tone: "success" });
      load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const editAttribute = (attribute: AdminAttribute) => {
    setEditingAttributeId(attribute.id);
    setSelectedAttributeId(attribute.id);
    setAttributeCode(attribute.code);
    setAttributeType(attribute.data_type);
    setAttributeInput(attribute.input_type);
    setAttributeNames({
      en: attribute.translations?.find((item) => item.locale === "en")?.name ?? "",
      fa: attribute.translations?.find((item) => item.locale === "fa")?.name ?? "",
      ps: attribute.translations?.find((item) => item.locale === "ps")?.name ?? "",
    });
  };

  const deleteAttribute = async () => {
    if (!selectedAttributeId || !mayManage) return;
    setSaving(true);
    setNotice(null);
    try {
      await repository.deleteAttribute(selectedAttributeId);
      setSelectedAttributeId(null);
      setDeleteTarget(null);
       setNotice({ title: t("attributeDeleted"), tone: "success" });
      load();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const createOption = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAttributeId || !mayManage || !optionValue.trim() || !optionSlug.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const option = await repository.createOption({
        attribute_id: selectedAttributeId,
        value: optionValue.trim(),
        slug: optionSlug.trim(),
        is_active: true,
      });
      setOptions((current) => [...current, option]);
      setOptionValue("");
      setOptionSlug("");
       setNotice({ title: t("optionCreated"), tone: "success" });
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async () => {
    if (!selectedId || !assignmentToRemove || !mayManage) return;
    setSaving(true);
    try {
      await repository.removeCategoryAttribute(selectedId, assignmentToRemove);
      setAssignmentToRemove(null);
      setSchema(await repository.schemaPreview(selectedId, locale));
       setNotice({ title: t("assignmentRemoved"), tone: "success" });
    } catch (reason) {
      setSchemaError(reason);
    } finally {
      setSaving(false);
    }
  };

  const categoryTreeItems = categoryRows(categories);
  const visibleCategoryIds = new Set(
    categoryTreeItems.slice(0, categoryVisibleCount).map(({ category }) => category.id),
  );
  const visibleCategories = categories.filter((category) => visibleCategoryIds.has(category.id));
  const visibleAttributes = attributes.slice(0, attributeVisibleCount);
  const selectedAttribute = attributes.find((attribute) => attribute.id === selectedAttributeId);
  const supportsOptions = Boolean(
    selectedAttribute &&
      (["select", "radio", "multi-select"].includes(selectedAttribute.input_type) ||
        ["option", "select", "multiselect"].includes(selectedAttribute.data_type)),
  );

  return (
    <>
      <AdminPageGuard permission={adminPermissions.categories}>
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : error instanceof ApiError && error.status === 403 ? (
        <ForbiddenState />
      ) : error ? (
        <ErrorState
          description={
            error instanceof ApiError ? error.message : t("loadError")
          }
          onRetry={load}
        />
      ) : (
        <div className={styles.page}>
          <header className={styles.hero}>
            <div className={styles.heading}>
              <span className={styles.icon}>
                <Tags size={21} />
              </span>
              <div>
                <h1>{t("title")}</h1>
                <small>{t("description")}</small>
              </div>
            </div>
          </header>
          {notice ? (
            <Toast title={notice.title} tone={notice.tone} onDismiss={() => setNotice(null)} />
          ) : null}
          <div className={styles.grid}>
              <section className={styles.panel}>
                <h2>{t("categories")}</h2>
                {selectedId && mayManageCategories ? (
                  <div className={styles.toolbar}>
                    <span>{categoryName(categories.find((item) => item.id === selectedId)!, locale)}</span>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        const category = categories.find((item) => item.id === selectedId);
                        if (category) editCategory(category);
                      }}
                    >
                      {editingCategoryId === selectedId ? t("editing") : t("editCategory")}
                    </Button>
                    <Button variant="danger" size="sm" type="button" onClick={() => setDeleteTarget("category")}>
                      {t("deleteCategory")}
                    </Button>
                  </div>
                ) : null}
                {mayManageCategories ? (
                  <form className={styles.create} onSubmit={createCategory}>
                    <h3>{editingCategoryId ? t("editCategory") : t("createCategory")}</h3>
                    <label>
                      {t("slug")}
                      <input
                        required
                        value={categorySlug}
                        placeholder={t("slugPlaceholder")}
                        onChange={(event) => setCategorySlug(event.target.value)}
                      />
                    </label>
                    <label>
                      {t("englishName")}
                      <input required value={categoryNames.en} onChange={(event) => setCategoryNames((current) => ({ ...current, en: event.target.value }))} />
                    </label>
                    <label>
                      {t("dariName")}
                      <input required value={categoryNames.fa} onChange={(event) => setCategoryNames((current) => ({ ...current, fa: event.target.value }))} />
                    </label>
                    <label>
                      {t("pashtoName")}
                      <input required value={categoryNames.ps} onChange={(event) => setCategoryNames((current) => ({ ...current, ps: event.target.value }))} />
                    </label>
                    {!categoryParent ? (
                      <SearchableIconPicker
                        key={`${editingCategoryId ?? "new"}-${categoryIcon}`}
                        value={categoryIcon}
                        onChange={setCategoryIcon}
                      />
                    ) : null}
                    <label>
                      {t("parentCategory")}
                      <SearchableSelect
                        value={categoryParent}
                        placeholder={t("rootCategory")}
                        onChange={setCategoryParent}
                        options={[{ value: "", label: t("rootCategory") }, ...categoryRows(categories)
                          .filter(({ category }) => category.id !== editingCategoryId)
                          .map(({ category, depth }) => ({ value: String(category.id), label: `${"- ".repeat(depth)}${categoryName(category, locale)}` }))]}
                      />
                    </label>
                    <label>
                      {t("rootType")}
                      <SearchableSelect
                        value={categoryRoot}
                        disabled={Boolean(categoryParent)}
                        placeholder={t("rootType")}
                        onChange={setCategoryRoot}
                        options={[
                          { value: "goods", label: t("goods") },
                          { value: "real_estate", label: t("realEstate") },
                          { value: "vehicle", label: t("vehicle") },
                          { value: "job", label: t("job") },
                        ]}
                      />
                    </label>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={categoryDefaultExpanded}
                        onChange={(event) => setCategoryDefaultExpanded(event.target.checked)}
                      />
                      {t("defaultExpanded")}
                    </label>
                    <div className={styles.formActions}>
                      <Button loading={saving} size="sm" type="submit">
                        {editingCategoryId ? t("updateAction") : t("createAction")}
                      </Button>
                      {editingCategoryId ? (
                        <Button variant="ghost" size="sm" type="button" onClick={() => {
                          resetCategoryForm();
                        }}>{t("cancel")}</Button>
                      ) : null}
                    </div>
                  </form>
                ) : null}
                <AdminCategoryTree
                  categories={visibleCategories}
                  locale={locale}
                  selectedId={selectedId}
                  expanded={expandedCategoryIds}
                  onSelect={setSelectedId}
                  onToggle={(id) =>
                    setExpandedCategoryIds((current) => {
                      const next = new Set(current);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                />
                {categoryTreeItems.length > categoryVisibleCount ? (
                  <div className={styles.paginationActions}>
                    <Button size="sm" type="button" onClick={() => setCategoryVisibleCount((count) => count + 10)}>{t("showMore")}</Button>
                  </div>
                ) : categoryVisibleCount > 10 ? (
                  <div className={styles.paginationActions}><Button size="sm" type="button" onClick={() => setCategoryVisibleCount(10)}>{t("showLess")}</Button></div>
                ) : null}
              </section>
              <section className={styles.panel}>
                <h2>{t("attributes")}</h2>
                {selectedAttributeId && mayManage ? (
                  <div className={styles.toolbar}>
                    <span>{selectedAttribute ? attributeName(selectedAttribute, locale) : null}</span>
                    <Button size="sm" type="button" onClick={() => {
                      const attribute = attributes.find((item) => item.id === selectedAttributeId);
                      if (attribute) editAttribute(attribute);
                    }}>{editingAttributeId === selectedAttributeId ? t("editing") : t("editAttribute")}</Button>
                    <Button variant="danger" size="sm" type="button" onClick={() => setDeleteTarget("attribute")}>{t("deleteAttribute")}</Button>
                  </div>
                ) : null}
                {mayManage ? (
                  <form className={styles.create} onSubmit={createAttribute}>
                    <h3>{editingAttributeId ? t("editAttribute") : t("createAttribute")}</h3>
                    <label>
                      {t("code")}
                      <input
                        required
                        value={attributeCode}
                        placeholder={t("codePlaceholder")}
                        onChange={(event) => setAttributeCode(event.target.value)}
                      />
                    </label>
                    <label>
                      {t("englishName")}
                      <input required value={attributeNames.en} onChange={(event) => setAttributeNames((current) => ({ ...current, en: event.target.value }))} />
                    </label>
                    <label>
                      {t("dariName")}
                      <input required value={attributeNames.fa} onChange={(event) => setAttributeNames((current) => ({ ...current, fa: event.target.value }))} />
                    </label>
                    <label>
                      {t("pashtoName")}
                      <input required value={attributeNames.ps} onChange={(event) => setAttributeNames((current) => ({ ...current, ps: event.target.value }))} />
                    </label>
                    <label>
                      {t("dataType")}
                      <SearchableSelect
                        value={attributeType}
                        onChange={setAttributeType}
                        placeholder={t("dataType")}
                        options={[
                          { value: "string", label: t("string") },
                          { value: "integer", label: t("integer") },
                          { value: "decimal", label: t("decimal") },
                          { value: "boolean", label: t("boolean") },
                          { value: "date", label: t("date") },
                          { value: "datetime", label: t("datetime") },
                          { value: "json", label: t("json") },
                          { value: "option", label: t("option") },
                          { value: "multiselect", label: t("multiselect") },
                          { value: "location", label: t("location") },
                        ]}
                      />
                    </label>
                    <label>
                      {t("inputType")}
                      <SearchableSelect
                        value={attributeInput}
                        onChange={setAttributeInput}
                        placeholder={t("inputType")}
                        options={[
                          { value: "text", label: t("text") },
                          { value: "textarea", label: t("textarea") },
                          { value: "number", label: t("number") },
                          { value: "integer", label: t("integer") },
                          { value: "decimal", label: t("decimal") },
                          { value: "password", label: t("password") },
                          { value: "email", label: t("email") },
                          { value: "url", label: t("url") },
                          { value: "checkbox", label: t("checkbox") },
                          { value: "select", label: t("select") },
                          { value: "radio", label: t("radio") },
                          { value: "multi-select", label: t("multiSelect") },
                          { value: "date", label: t("date") },
                          { value: "datetime", label: t("datetime") },
                          { value: "time", label: t("time") },
                          { value: "range", label: t("range") },
                          { value: "location", label: t("location") },
                        ]}
                      />
                    </label>
                    <div className={styles.formActions}>
                      <Button loading={saving} size="sm" type="submit">
                        {editingAttributeId ? t("updateAction") : t("createAction")}
                      </Button>
                      {editingAttributeId ? (
                        <Button variant="ghost" size="sm" type="button" onClick={() => {
                          resetAttributeForm();
                        }}>{t("cancel")}</Button>
                      ) : null}
                    </div>
                  </form>
                ) : null}
                <div className={styles.list}>
                  {visibleAttributes.map((attribute) => (
                    <button
                      className={`${styles.item} ${selectedAttributeId === attribute.id ? styles.selected : ""}`}
                      key={attribute.id}
                      type="button"
                      onClick={() => setSelectedAttributeId(attribute.id)}
                    >
                       <b>{attributeName(attribute, locale)}</b>
                       <small>{attribute.code}</small>
                      <small>
                        {t.has(`inputTypes.${attribute.input_type}`) ? t(`inputTypes.${attribute.input_type}`) : attribute.input_type} · {t.has(`dataTypes.${attribute.data_type}`) ? t(`dataTypes.${attribute.data_type}`) : attribute.data_type}
                      </small>
                    </button>
                  ))}
                </div>
                {attributes.length > attributeVisibleCount ? (
                  <div className={styles.paginationActions}><Button size="sm" type="button" onClick={() => setAttributeVisibleCount((count) => count + 10)}>{t("showMore")}</Button></div>
                ) : attributeVisibleCount > 10 ? (
                  <div className={styles.paginationActions}><Button size="sm" type="button" onClick={() => setAttributeVisibleCount(10)}>{t("showLess")}</Button></div>
                ) : null}
                {selectedAttributeId && supportsOptions && mayManage ? (
                  <form className={styles.create} onSubmit={createOption}>
                    <h3>{t("createOption")}</h3>
                    <label>
                      {t("optionValue")}
                      <input
                        required
                        value={optionValue}
                        onChange={(event) => setOptionValue(event.target.value)}
                      />
                    </label>
                    <label>
                      {t("optionSlug")}
                      <input
                        required
                        value={optionSlug}
                        onChange={(event) => setOptionSlug(event.target.value)}
                      />
                    </label>
                    <Button loading={saving} size="sm" type="submit">
                      {t("createAction")}
                    </Button>
                    {options.length ? (
                      <small className={styles.muted}>
                        {options.map((option) => option.value).join(", ")}
                      </small>
                    ) : null}
                  </form>
                ) : null}
                <div className={styles.body}>
                  {mayManage ? (
                    <form className={styles.assign} onSubmit={assign}>
                      <h3>{t("assign")}</h3>
                      <label>
                        {t("attribute")}
                        <SearchableSelect
                          value={assignmentId}
                          placeholder={t("selectAttribute")}
                          onChange={setAssignmentId}
                          options={[
                            { value: "", label: t("selectAttribute") },
                            ...visibleAttributes.map((attribute) => ({ value: String(attribute.id), label: attributeName(attribute, locale) })),
                          ]}
                        />
                      </label>
                      <label>
                        {t("section")}
                        <SearchableSelect
                          value={sectionId}
                          placeholder={t("noSection")}
                          onChange={setSectionId}
                          options={[{ value: "", label: t("noSection") }, ...sections
                            .filter(
                              (section) =>
                                !section.category_id ||
                                section.category_id === selectedId,
                            )
                            .map((section) => ({ value: String(section.id), label: section.code }))]}
                        />
                      </label>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={required}
                          onChange={(event) =>
                            setRequired(event.target.checked)
                          }
                        />
                        {t("required")}
                      </label>
                      <label>
                        {t("sortOrder")}
                        <input
                          type="number"
                          min="0"
                          value={sortOrder}
                          onChange={(event) => setSortOrder(event.target.value)}
                        />
                      </label>
                      <div className={styles.actions}>
                        <Button loading={saving} size="sm" type="submit">
                          {t("assignAction")}
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </section>
              <section className={`${styles.panel} ${styles.schemaPanel}`}>
                <h2>{t("schema")}</h2>
                <div className={styles.body}>
                  {schemaLoading ? (
                    <LoadingState label={t("schemaLoading")} />
                  ) : schemaError instanceof ApiError &&
                    schemaError.status === 403 ? (
                    <ForbiddenState />
                  ) : schemaError ? (
                    <ErrorState description={t("schemaError")} />
                  ) : schema?.fields.length ? (
                    <div className={styles.schema}>
                      {schema.fields.map((field) => (
                        <div className={styles.field} key={field.attribute_id}>
                          <div className={styles.fieldHeader}>
                            <div className={styles.fieldTitle}>
                              <b>{field.label ?? field.code}</b>
                              <small>
                                {t("assignedFrom", {
                                  category: categoryName(
                                    categories.find((item) => item.id === field.assignment_category_id) ?? {
                                      id: field.assignment_category_id ?? 0,
                                      parent_id: null,
                                      slug: String(field.assignment_category_id ?? ""),
                                      status: true,
                                      is_selectable: true,
                                      allow_listings: true,
                                      translations: [],
                                    },
                                    locale,
                                  ),
                                })}
                                {field.assignment_category_id !== selectedId ? ` · ${t("inherited")}` : ""}
                              </small>
                            </div>
                            {mayManage && field.assignment_category_id === selectedId ? (
                              <div className={styles.fieldActions}>
                                <Button variant="danger" size="sm" type="button" onClick={() => setAssignmentToRemove(field.attribute_id)}>
                                  {t("removeAssignment")}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <small>
                            {t.has(`inputTypes.${field.input_type}`) ? t(`inputTypes.${field.input_type}`) : field.input_type} · {t.has(`dataTypes.${field.data_type}`) ? t(`dataTypes.${field.data_type}`) : field.data_type}
                            {field.required ? ` · ${t("required")}` : ""}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={t("noFields")}
                      description={t("noFieldsDescription")}
                    />
                  )}
                </div>
              </section>
            </div>
        </div>
      )}
      </AdminPageGuard>
      <ConfirmationDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("confirmDeleteTitle")}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void (deleteTarget === "category" ? deleteCategory() : deleteAttribute())}
      >
        {t("confirmDeleteDescription")}
      </ConfirmationDialog>
      <ConfirmationDialog
        open={assignmentToRemove !== null}
        onClose={() => setAssignmentToRemove(null)}
        title={t("removeAssignmentTitle")}
        confirmLabel={t("removeAssignment")}
        cancelLabel={t("cancel")}
        onConfirm={() => void removeAssignment()}
      >
        {t("removeAssignmentDescription")}
      </ConfirmationDialog>
    </>
  );
}
