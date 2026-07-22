import type { AppLocale } from "./config";
import en from "../../messages/en/common.json";
import fa from "../../messages/fa/common.json";
import ps from "../../messages/ps/common.json";
import enPhaseOne from "../../messages/en.json";
import faPhaseOne from "../../messages/fa.json";
import psPhaseOne from "../../messages/ps.json";

const messages = {
  en: { ...en, ...enPhaseOne },
  fa: { ...fa, ...faPhaseOne },
  ps: { ...ps, ...psPhaseOne },
} as const;

export type TranslationMessages = typeof messages.en;
export type TranslationNamespace = keyof TranslationMessages;

export function messagesFor(locale: AppLocale) {
  return messages[locale];
}
