"use client";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
export default function NotFound(){const t=useTranslations("notFound");return <main className="shell page empty"><h1>{t("title")}</h1><p>{t("description")}</p><Link className="post" href="/search">{t("action")}</Link></main>}
