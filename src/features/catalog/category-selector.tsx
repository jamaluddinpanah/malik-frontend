"use client";

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient, type ApiResponse } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import type { ApiCategory, CategoryPath } from "./category-types";
import styles from "./catalog-forms.module.css";

type State = "loading" | "ready" | "error";
export function CategorySelector({
  onSelect,
  allowCategory = () => true,
}: {
  onSelect: (category: ApiCategory, path: CategoryPath) => void;
  allowCategory?: (category: ApiCategory) => boolean;
}) {
  const [path, setPath] = useState<CategoryPath>([]);
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [state, setState] = useState<State>("loading");
  const requestController = useRef<AbortController | null>(null);
  const t = useTranslations("categoryForms");
  const load = useCallback((parent?: ApiCategory, signal?: AbortSignal) => {
    setState("loading");
    const endpoint = parent
      ? routes.api.categoryChildren(parent.id)
      : routes.api.categories;
    return apiClient
      .request<ApiResponse<ApiCategory[]>>(endpoint, { signal })
      .then((response) => {
        setItems(response.data.filter(allowCategory));
        setState("ready");
      })
      .catch(() => {
        if (!signal?.aborted) setState("error");
      });
  }, [allowCategory]);
  useEffect(() => {
    const controller = new AbortController();
    const requestId = window.setTimeout(
      () => void load(undefined, controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(requestId);
      controller.abort();
    };
  }, [load]);
  useEffect(() => () => requestController.current?.abort(), []);
  const choose = async (category: ApiCategory) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const nextPath = [...path, category];
    setState("loading");
    try {
      const response = await apiClient.request<ApiResponse<ApiCategory[]>>(
        routes.api.categoryChildren(category.id),
        { signal: controller.signal },
      );
      if (response.data.length) {
        setPath(nextPath);
        setItems(response.data.filter(allowCategory));
        setState("ready");
      } else {
        setPath(nextPath);
        setState("ready");
        if (
          category.is_selectable !== false &&
          category.allow_listings !== false &&
          category.status !== false
        )
          selectLeaf(category, nextPath);
      }
    } catch {
      if (!controller.signal.aborted) setState("error");
    }
  };
  const selectLeaf = (
    category: ApiCategory,
    selectedPath = [...path, category],
  ) => onSelect(category, selectedPath);
  const back = () => {
    const nextPath = path.slice(0, -1);
    setPath(nextPath);
    const parent = nextPath.at(-1);
    if (parent?.children.length) setItems(parent.children);
    else void load(parent);
  };
  return (
    <section
      className={styles.selector}
      aria-labelledby="category-selector-title"
    >
      <header>
        <div>
          <h2 id="category-selector-title">{t("title")}</h2>
          <p>
            {path.length
              ? path.map((item) => item.name ?? item.slug).join(" / ")
              : t("description")}
          </p>
        </div>
        {path.length ? (
          <button type="button" onClick={back}>
            <ChevronLeft className={styles.directionalIcon} /> {t("back")}
          </button>
        ) : null}
      </header>
      {state === "loading" ? (
        <p className={styles.state}>
          <LoaderCircle className={styles.spin} /> {t("loading")}
        </p>
      ) : null}
      {state === "error" ? (
        <p className={styles.state}>
          {t("error")}{" "}
          <button type="button" onClick={() => void load(path.at(-1))}>
            <RotateCcw size={15} /> {t("retry")}
          </button>
        </p>
      ) : null}
      {state === "ready" && !items.length ? (
        <p className={styles.state}>{t("empty")}</p>
      ) : null}
      {state === "ready" && items.length ? (
        <ul>
          {items.map((category) => (
            <li key={category.id}>
              <button type="button" onClick={() => void choose(category)}>
                <span>
                  <b>{category.name ?? category.slug}</b>
                  {category.description ? (
                    <small>{category.description}</small>
                  ) : null}
                </span>
                <ChevronRight className={styles.directionalIcon} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {state === "ready" &&
      !items.length &&
      path.length &&
      path.at(-1)?.is_selectable !== false &&
      path.at(-1)?.allow_listings !== false &&
      path.at(-1)?.status !== false ? (
        <button
          className={styles.selectCurrent}
          type="button"
          onClick={() => selectLeaf(path.at(-1)!)}
        >
          {t("useCategory", {
            category: path.at(-1)?.name ?? path.at(-1)?.slug ?? "",
          })}
        </button>
      ) : null}
    </section>
  );
}
