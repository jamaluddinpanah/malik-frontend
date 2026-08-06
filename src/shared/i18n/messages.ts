import type { AppLocale } from "./config";
import en from "../../../messages/en/common.json";
import fa from "../../../messages/fa/common.json";
import ps from "../../../messages/ps/common.json";
import enPhaseOne from "../../../messages/en.json";
import faPhaseOne from "../../../messages/fa.json";
import psPhaseOne from "../../../messages/ps.json";
import enModeration from "../../../messages/en/admin-moderation.json";
import faModeration from "../../../messages/fa/admin-moderation.json";
import psModeration from "../../../messages/ps/admin-moderation.json";
import enListings from "../../../messages/en/admin-listings.json";
import faListings from "../../../messages/fa/admin-listings.json";
import psListings from "../../../messages/ps/admin-listings.json";
import enJobs from "../../../messages/en/jobs.json";
import faJobs from "../../../messages/fa/jobs.json";
import psJobs from "../../../messages/ps/jobs.json";

const messages = {
  en: { ...en, ...enPhaseOne, adminModeration: enModeration, adminListings: enListings, jobs: enJobs },
  fa: { ...fa, ...faPhaseOne, adminModeration: faModeration, adminListings: faListings, jobs: faJobs },
  ps: { ...ps, ...psPhaseOne, adminModeration: psModeration, adminListings: psListings, jobs: psJobs },
} as const;

export type TranslationMessages = typeof messages.en;
export type TranslationNamespace = keyof TranslationMessages;

export function messagesFor(locale: AppLocale) {
  return messages[locale];
}
