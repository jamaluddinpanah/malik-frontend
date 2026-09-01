"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactSelect from "react-select";
import { apiClient } from "@/shared/lib/api";
import styles from "./location-selector.module.css";

export type LocationOption = {
  id: number;
  parent_id: number | null;
  type: "country" | "province" | "city" | "district" | "neighborhood";
  name: string;
  children_count: number;
};

type SelectOption = { value: number; label: string; area: LocationOption };

function optionsFor(items: LocationOption[]): SelectOption[] {
  return items.map((area) => ({ value: area.id, label: area.name, area }));
}

export function LocationSelector({ value, onChange }: { value?: number; onChange: (area: LocationOption | null) => void }) {
  const t = useTranslations("categoryForms"); const locale = useLocale();
  const [roots, setRoots] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [villages, setVillages] = useState<LocationOption[]>([]);
  const [provinceVillages, setProvinceVillages] = useState<LocationOption[]>([]);
  const [country, setCountry] = useState<LocationOption | null>(null);
  const [province, setProvince] = useState<LocationOption | null>(null);
  const [district, setDistrict] = useState<LocationOption | null>(null);
  const [village, setVillage] = useState<LocationOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolvedValue = useRef<number | undefined>(undefined);
  const loadChildren = useCallback((parentId: number, setItems: (items: LocationOption[]) => void) => void apiClient.request<{ data: LocationOption[] }>(`/api/v1/locations/${parentId}/children`).then((response) => { setItems(response.data); setError(null); }).catch(() => setError(t("locationError"))), [t]);

  useEffect(() => { void apiClient.request<{ data: LocationOption[] }>("/api/v1/locations/roots").then((response) => { setRoots(response.data); setError(null); }).catch(() => setError(t("locationError"))); }, [t]);
  useEffect(() => { if (country) loadChildren(country.id, setProvinces); }, [country, loadChildren]);
  useEffect(() => { if (province) loadChildren(province.id, (items) => { setDistricts(items.filter((area) => area.type === "district")); setProvinceVillages(items.filter((area) => area.type === "neighborhood")); }); }, [province, loadChildren]);
  useEffect(() => { if (!district || district.id === province?.id) return; loadChildren(district.id, setVillages); }, [district, province, loadChildren]);
  useEffect(() => {
    if (!value || resolvedValue.current === value) return;
    let cancelled = false;
    void (async () => {
      const lineage: LocationOption[] = []; let id: number | null = value;
      while (id) { const response: { data: LocationOption } = await apiClient.request<{ data: LocationOption }>(`/api/v1/locations/${id}`); lineage.unshift(response.data); id = response.data.parent_id; }
      if (cancelled) return;
      setCountry(lineage.find((area) => area.type === "country") ?? null);
      const provinceArea = lineage.find((area) => area.type === "province") ?? null;
      const villageArea = lineage.find((area) => area.type === "neighborhood") ?? null;
      setProvince(provinceArea);
      setDistrict(lineage.find((area) => area.type === "district") ?? (villageArea?.parent_id === provinceArea?.id && provinceArea ? { ...provinceArea, name: t("provinceCapital", { province: provinceArea.name }) } : null));
      setVillage(villageArea);
      resolvedValue.current = value;
    })().catch(() => { if (!cancelled) resolvedValue.current = undefined; });
    return () => { cancelled = true; };
  }, [t, value]);
  if (error) return <p role="alert">{error}</p>;
  const props = { className: styles.select, classNamePrefix: "location-select", isRtl: locale !== "en", isSearchable: true, isClearable: true, menuPortalTarget: typeof document === "undefined" ? undefined : document.body, styles: { menuPortal: (base: object) => ({ ...base, zIndex: 20 }) } };
  const selected = (area: LocationOption | null) => area ? { value: area.id, label: area.name, area } : null;
  const resetBelowCountry = () => { setProvince(null); setDistrict(null); setVillage(null); setProvinces([]); setDistricts([]); setProvinceVillages([]); setVillages([]); };
  const provincialDistrict = province && provinceVillages.length ? { ...province, name: t("provinceCapital", { province: province.name }), children_count: provinceVillages.length } : null;
  const districtOptions = provincialDistrict ? [provincialDistrict, ...districts] : districts;
  const selectedVillages = district?.id === province?.id ? provinceVillages : villages;
  return <div className={styles.selector}>
    <ReactSelect {...props} options={optionsFor(roots)} value={selected(country)} aria-label={t("selectLocation")} placeholder={t("selectLocation")} onChange={(option) => { if (!option) { resolvedValue.current = undefined; setCountry(null); resetBelowCountry(); onChange(null); return; } resolvedValue.current = option.area.id; setCountry(option.area); resetBelowCountry(); onChange(option.area); }} />
    {country ? <ReactSelect {...props} options={optionsFor(provinces)} value={selected(province)} aria-label={t("selectProvince")} placeholder={t("selectProvince")} noOptionsMessage={() => t("selectProvince")} onChange={(option) => { if (!option) { resolvedValue.current = country.id; setProvince(null); setDistrict(null); setVillage(null); setDistricts([]); setProvinceVillages([]); setVillages([]); onChange(country); return; } resolvedValue.current = option.area.id; setProvince(option.area); setDistrict(null); setVillage(null); setDistricts([]); setProvinceVillages([]); setVillages([]); onChange(option.area); }} /> : null}
    {districtOptions.length ? <ReactSelect {...props} options={optionsFor(districtOptions)} value={selected(district)} aria-label={t("selectDistrict")} placeholder={t("selectDistrict")} noOptionsMessage={() => t("selectDistrict")} onChange={(option) => { if (!option) { resolvedValue.current = province?.id; setDistrict(null); setVillage(null); setVillages([]); onChange(province); return; } resolvedValue.current = option.area.id; setDistrict(option.area); setVillage(null); setVillages([]); onChange(option.area); }} /> : null}
    {district?.children_count ? <ReactSelect {...props} options={optionsFor(selectedVillages)} value={selected(village)} aria-label={t("selectVillage")} placeholder={t("selectVillage")} noOptionsMessage={() => t("selectVillage")} onChange={(option) => { if (!option) { resolvedValue.current = district.id; setVillage(null); onChange(district); return; } resolvedValue.current = option.area.id; setVillage(option.area); onChange(option.area); }} /> : null}
  </div>;
}