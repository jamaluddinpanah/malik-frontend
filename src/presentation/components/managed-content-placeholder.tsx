import { getTranslations } from "next-intl/server";
import { PublicContentContainer } from "./public-content-container";

export async function ManagedContentPlaceholder({ titleKey }: { titleKey: "about" | "safety" | "terms" | "privacy" | "contact" }) {
  const t = await getTranslations("publicShell");
  return <PublicContentContainer><section className="account-panel"><h1>{t(titleKey)}</h1><p>{t("managedContent")}</p></section></PublicContentContainer>;
}
