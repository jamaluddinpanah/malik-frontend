"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/shared/lib/api";

export type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_default: boolean;
};

export function CurrencySelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (currency: Currency) => void;
}) {
  const t = useTranslations("categoryForms");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const resolved = useRef<number | undefined>(undefined);
  useEffect(() => {
    void apiClient
      .request<{ data: Currency[] }>("/api/v1/currencies")
      .then((response) => setCurrencies(response.data))
      .catch(() => setError(t("currencyError")));
  }, [t]);
  useEffect(() => {
    if (!value) {
      resolved.current = undefined;
      return;
    }
    const current = currencies.find((item) => item.id === value);
    if (current && resolved.current !== current.id) {
      resolved.current = current.id;
      onChange(current);
    }
  }, [currencies, onChange, value]);
  if (error) return <p role="alert">{error}</p>;
  return (
    <select
      value={value ?? ""}
      aria-label={t("selectCurrency")}
      onChange={(event) => {
        const currency = currencies.find(
          (item) => item.id === Number(event.target.value),
        );
        if (currency) onChange(currency);
      }}
    >
      <option value="">{t("selectCurrency")}</option>
      {currencies.map((currency) => (
        <option key={currency.id} value={currency.id}>
          {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
}
