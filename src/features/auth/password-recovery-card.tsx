"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authErrors, useAuth } from "./auth-provider";
import {
  LocalizedLink,
  withActiveLocale,
} from "@/shared/ui/localized-link";
import styles from "@/features/auth/auth-card.module.css";

export function PasswordRecoveryCard({ reset = false }: { reset?: boolean }) {
  const t = useTranslations("account");
  const authT = useTranslations("auth");
  const { forgotPassword, resetPassword, isAuthenticating } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAuthenticating) return;
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (reset)
        await resetPassword({
          email: String(form.get("email")),
          token: String(form.get("token")),
          password: String(form.get("password")),
          passwordConfirmation: String(form.get("password_confirmation")),
        });
      else await forgotPassword(String(form.get("email")));
      setMessage(reset ? t("passwordReset") : t("resetLinkSent"));
    } catch (reason) {
      setError(authErrors(reason).message);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <form onSubmit={submit}>
          <h1>{reset ? t("resetPassword") : t("forgotPassword")}</h1>
          {message && <p role="status">{message}</p>}
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <label>
            {authT("email")}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={searchParams.get("email") ?? ""}
            />
          </label>
          {reset && (
            <>
              <label>
                {t("resetToken")}
                <input
                  name="token"
                  required
                  defaultValue={searchParams.get("token") ?? ""}
                />
              </label>
              <label>
                {t("newPassword")}
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label>
                {t("confirmPassword")}
                <input
                  name="password_confirmation"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          <button disabled={isAuthenticating}>
            {isAuthenticating
              ? t("pleaseWait")
              : reset
                ? t("resetPassword")
                : t("sendResetLink")}
          </button>
          <LocalizedLink
            className={styles.outline}
            href={withActiveLocale("/login", pathname) as string}
          >
            {t("backToSignIn")}
          </LocalizedLink>
        </form>
      </section>
    </main>
  );
}
