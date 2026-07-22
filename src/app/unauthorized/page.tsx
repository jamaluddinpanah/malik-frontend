import { LocalizedLink as Link } from "@/presentation/components/localized-link";
import { getTranslations } from "next-intl/server";

export default async function UnauthorizedPage(){ const t=await getTranslations("unauthorized"); return <main className="page"><section className="empty"><h1>{t("title")}</h1><p>{t("description")}</p><Link className="post" href="/">{t("action")}</Link></section></main>; }
