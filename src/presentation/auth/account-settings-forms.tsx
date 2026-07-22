"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth, authErrors } from "./auth-provider";
import styles from "@/presentation/components/auth-card.module.css";

function profileDisplayName(profile: Record<string, unknown> | null): string {
  return typeof profile?.display_name === "string" ? profile.display_name : "";
}

function profileValue(
  profile: Record<string, unknown> | null,
  key: string,
): string {
  return typeof profile?.[key] === "string" ? profile[key] : "";
}

export function ProfileSettingsForm() {
  const t = useTranslations("account");
  const language = useTranslations("language");
  const { user, updateProfile, isAuthenticating } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  if (!user) return null;
  const accountType = user.account_type;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAuthenticating) return;
    const form = new FormData(event.currentTarget);
    setMessage(null);
    setError(null);
    setFieldErrors({});
    let profile: Record<string, string> | undefined;
    if (accountType === "individual")
      profile = {
        display_name: String(form.get("display_name")),
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name") || ""),
      };
    if (accountType === "business")
      profile = {
        display_name: String(form.get("display_name")),
        legal_name: String(form.get("legal_name")),
      };
    if (accountType === "organization")
      profile = {
        organization_name: String(form.get("organization_name")),
        organization_type: String(form.get("organization_type") || ""),
      };
    try {
      await updateProfile({
        name: String(form.get("name")),
        preferredLocale: String(form.get("preferred_locale")) as
          "en" | "fa" | "ps",
        ...(profile ? { profile } : {}),
      });
      setMessage(t("profileUpdated"));
    } catch (reason) {
      const parsed = authErrors(reason);
      setFieldErrors(parsed.fields);
      setError(Object.keys(parsed.fields).length ? null : parsed.message);
    }
  }
  const errorFor = (field: string) =>
    fieldErrors[field]?.[0] ?? fieldErrors[`profile.${field}`]?.[0];
  const field = (name: string, element: React.ReactElement) => (
    <>
      {element}
      {errorFor(name) ? (
        <small className={styles.fieldError} role="alert">
          {errorFor(name)}
        </small>
      ) : null}
    </>
  );
  const typeFields =
    accountType === "individual" ? (
      <>
        <label>
          {t("firstName")}
          {field(
            "first_name",
            <input
              name="first_name"
              defaultValue={profileValue(user.profile, "first_name")}
              required
              maxLength={100}
            />,
          )}
        </label>
        <label>
          {t("lastName")}
          {field(
            "last_name",
            <input
              name="last_name"
              defaultValue={profileValue(user.profile, "last_name")}
              maxLength={100}
            />,
          )}
        </label>
      </>
    ) : accountType === "business" ? (
      <label>
        {t("legalName")}
        {field(
          "legal_name",
          <input
            name="legal_name"
            defaultValue={profileValue(user.profile, "legal_name")}
            required
            maxLength={255}
          />,
        )}
      </label>
    ) : accountType === "organization" ? (
      <>
        <label>
          {t("organizationName")}
          {field(
            "organization_name",
            <input
              name="organization_name"
              defaultValue={profileValue(user.profile, "name")}
              required
              maxLength={255}
            />,
          )}
        </label>
        <label>
          {t("organizationType")}
          {field(
            "organization_type",
            <input
              name="organization_type"
              defaultValue={profileValue(user.profile, "organization_type")}
              maxLength={100}
            />,
          )}
        </label>
      </>
    ) : null;
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <form onSubmit={submit}>
          <h1>{t("profile")}</h1>
          {message ? <p role="status">{message}</p> : null}
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
          <label>
            {t("accountName")}
            {field(
              "name",
              <input
                name="name"
                defaultValue={user.name}
                required
                maxLength={255}
              />,
            )}
          </label>
          {typeFields}
          {accountType !== "organization" && accountType !== "superadmin" ? (
            <label>
              {t("displayName")}
              {field(
                "display_name",
                <input
                  name="display_name"
                  defaultValue={profileDisplayName(user.profile)}
                  required
                  maxLength={255}
                />,
              )}
            </label>
          ) : null}
          <label>
            {t("preferredLanguage")}
            {field(
              "preferred_locale",
              <select
                name="preferred_locale"
                defaultValue={user.preferred_locale}
              >
                <option value="en">{language("en")}</option>
                <option value="fa">{language("fa")}</option>
                <option value="ps">{language("ps")}</option>
              </select>,
            )}
          </label>
          <button disabled={isAuthenticating}>
            {isAuthenticating ? t("saving") : t("saveProfile")}
          </button>
        </form>
      </section>
    </main>
  );
}

export function SecuritySettingsForm() {
  const t = useTranslations("account");
  const { user, changePassword, resendVerification, isAuthenticating } =
    useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAuthenticating) return;
    const form = new FormData(event.currentTarget);
    setMessage(null);
    setError(null);
    setFieldErrors({});
    try {
      await changePassword({
        currentPassword: String(form.get("current_password")),
        password: String(form.get("password")),
        passwordConfirmation: String(form.get("password_confirmation")),
      });
      event.currentTarget.reset();
      setMessage(t("passwordChanged"));
    } catch (reason) {
      const parsed = authErrors(reason);
      setFieldErrors(parsed.fields);
      setError(Object.keys(parsed.fields).length ? null : parsed.message);
    }
  }
  async function resend() {
    if (isAuthenticating) return;
    setMessage(null);
    setError(null);
    try {
      await resendVerification();
      setMessage(t("verificationSent"));
    } catch (reason) {
      setError(authErrors(reason).message);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <form onSubmit={submit}>
          <h1>{t("security")}</h1>
          {message ? <p role="status">{message}</p> : null}
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
          {user?.email && !user.email_verified ? (
            <p>
              {t("emailNotVerified")}{" "}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={resend}
              >
                {t("resendVerification")}
              </button>
            </p>
          ) : null}
          <label>
            {t("currentPassword")}
            <input
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
            />
            {fieldErrors.current_password?.[0] ? (
              <small className={styles.fieldError} role="alert">
                {fieldErrors.current_password[0]}
              </small>
            ) : null}
          </label>
          <label>
            {t("newPassword")}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {fieldErrors.password?.[0] ? (
              <small className={styles.fieldError} role="alert">
                {fieldErrors.password[0]}
              </small>
            ) : null}
          </label>
          <label>
            {t("confirmPassword")}
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {fieldErrors.password_confirmation?.[0] ? (
              <small className={styles.fieldError} role="alert">
                {fieldErrors.password_confirmation[0]}
              </small>
            ) : null}
          </label>
          <button disabled={isAuthenticating}>
            {isAuthenticating ? t("saving") : t("changePassword")}
          </button>
        </form>
      </section>
    </main>
  );
}

export function VerifyEmailCard() {
  const t = useTranslations("account");
  const { user, resendVerification, isAuthenticating } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function resend() {
    if (isAuthenticating) return;
    setMessage(null);
    setError(null);
    try {
      await resendVerification();
      setMessage(t("verificationSent"));
    } catch (reason) {
      setError(authErrors(reason).message);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div>
          <h1>{t("verifyEmail")}</h1>
          {!user?.email ? (
            <p>{t("emailUnavailable")}</p>
          ) : user.email_verified ? (
            <p>{t("emailVerified")}</p>
          ) : (
            <>
              <p>{t("checkInbox")}</p>
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => void resend()}
              >
                {isAuthenticating ? t("sending") : t("resendVerification")}
              </button>
            </>
          )}
          {message ? <p role="status">{message}</p> : null}
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
