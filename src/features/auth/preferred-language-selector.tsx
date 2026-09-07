"use client";
import { Select } from "@/shared/ui/form-controls";
import { Form, Button } from "@/shared/ui/form-controls";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  clientLocale,
  locales,
  switchClientLocale,
  type AppLocale,
} from "@/shared/i18n/config";
import { authErrors, useAuth } from "./auth-provider";

export function PreferredLanguageSelector() {
  const t = useTranslations("settings");
  const language = useTranslations("language");
  const { user, updateProfile, isAuthenticating } = useAuth();
  const [selected, setSelected] = useState<AppLocale>(
    user?.preferred_locale ?? clientLocale(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!user || isAuthenticating) return;
    setMessage(null);
    setError(null);
    try {
      await updateProfile({ preferredLocale: selected });
      setMessage(t("languageSaved"));
      switchClientLocale(selected);
    } catch (reason) {
      setError(authErrors(reason).message);
    }
  }

  return (
    <section
      className="settings-panel"
      aria-labelledby="preferred-language-title"
    >
      <header>
        <div>
          <h1 id="preferred-language-title">{t("preferredLanguage")}</h1>
          <p>{t("preferredLanguageDescription")}</p>
        </div>
      </header>
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          return save();
        }}
      >
        <label>
          {t("preferredLanguage")}
          <Select
            value={selected}
            onChange={(event) => setSelected(event.target.value as AppLocale)}
            disabled={!user || isAuthenticating}
          >
            {locales.map((locale) => (
              <option value={locale} key={locale}>
                {language(locale)}
              </option>
            ))}
          </Select>
        </label>
        {!user ? <p className="muted">{t("languagePlaceholder")}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <Button variant="primary" type="submit" disabled={!user || isAuthenticating}>
          {isAuthenticating ? t("savingLanguage") : t("saveLanguage")}
        </Button>
      </Form>
    </section>
  );
}
