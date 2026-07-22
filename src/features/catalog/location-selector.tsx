"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api";

export type LocationOption = {
  id: number;
  parent_id: number | null;
  type: "country" | "province" | "city" | "district" | "neighborhood";
  name: string;
  children_count: number;
};

export function LocationSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (area: LocationOption) => void;
}) {
  const t = useTranslations("categoryForms");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [path, setPath] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const parentId = path.at(-1)?.id;
  useEffect(() => {
    void apiClient
      .request<{ data: LocationOption[] }>(
        parentId
          ? `/api/v1/locations/${parentId}/children`
          : "/api/v1/locations/roots",
      )
      .then((response) => {
        setOptions(response.data);
        setError(null);
      })
      .catch(() => setError(t("locationError")));
  }, [parentId, t]);
  if (error) return <p role="alert">{error}</p>;
  return (
    <div>
      <div>
        {path.map((area, index) => (
          <button
            type="button"
            key={area.id}
            onClick={() => setPath(path.slice(0, index))}
            dir="auto"
          >
            {area.name}
          </button>
        ))}
      </div>
      <select
        value={value ?? ""}
        aria-label={t("selectLocation")}
        onChange={(event) => {
          const area = options.find(
            (item) => item.id === Number(event.target.value),
          );
          if (!area) return;
          onChange(area);
          if (area.children_count) setPath([...path, area]);
        }}
      >
        <option value="">{t("selectLocation")}</option>
        {options.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </div>
  );
}
