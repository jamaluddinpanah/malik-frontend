import { LocalizedLink } from "@/presentation/components/localized-link";
import { getTranslations } from "next-intl/server";
export default async function Account() {
  const t = await getTranslations("account");
  return (
    <main className="shell page">
      <section className="account-panel">
        <h1>{t("myAccount")}</h1>
        <p>{t("manageDescription")}</p>
        <p>
          <LocalizedLink className="post" href="/account/profile">
            {t("profile")}
          </LocalizedLink>{" "}
          <LocalizedLink className="post" href="/account/security">
            {t("security")}
          </LocalizedLink>
        </p>
      </section>
    </main>
  );
}
