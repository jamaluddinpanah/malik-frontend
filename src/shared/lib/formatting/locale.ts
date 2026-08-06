import type { AppLocale } from "@/shared/i18n/config";

const intlLocale: Record<AppLocale, string> = { en: "en-US", fa: "fa-AF", ps: "ps-AF" };

export function formatNumber(value: number, locale: AppLocale, options: Intl.NumberFormatOptions = {}): string { return new Intl.NumberFormat(intlLocale[locale], options).format(value); }
export function formatCurrency(value: number, currency: string, locale: AppLocale, decimalPlaces?: number): string { return new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency, ...(decimalPlaces === undefined ? {} : { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }) }).format(value); }
/** @deprecated Use formatCurrency for new code. */
export const formatMoney = formatCurrency;
export function formatDate(value: Date | string | number, locale: AppLocale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string { return new Intl.DateTimeFormat(intlLocale[locale], options).format(new Date(value)); }
export function formatDateTime(value: Date | string | number, locale: AppLocale): string { return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" }); }
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale: AppLocale): string { return new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" }).format(value, unit); }
