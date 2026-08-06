"use client";

import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { Info, QrCode } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authErrors, useAuth } from "@/features/auth/auth-provider";
import {
  dashboardPath,
  isAdminPath,
  safeInternalRedirect,
} from "@/features/auth/redirects";
import { useEffect, useState } from "react";
import { withActiveLocale } from "@/shared/ui/localized-link";
import styles from "./auth-card.module.css";

const publicAccountTypes = ["individual", "business", "organization"] as const;
type PublicAccountType = (typeof publicAccountTypes)[number];

function isPublicAccountType(value: string): value is PublicAccountType {
  return publicAccountTypes.includes(value as PublicAccountType);
}

export function AuthCard({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticating, login, register } = useAuth();
  const t = useTranslations("auth");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [accountType, setAccountType] =
    useState<PublicAccountType>("individual");
  const next = searchParams.get("next");
  const safeNext = safeInternalRedirect(next);
  useEffect(() => {
    if (signup && !isLoading && user)
      router.replace(
        withActiveLocale(safeNext ?? dashboardPath(user), pathname) as string,
      );
  }, [isLoading, pathname, router, safeNext, signup, user]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAuthenticating) return;
    setFieldErrors({});
    setGeneralError(null);
    const form = new FormData(event.currentTarget);
    if (
      signup &&
      !String(form.get("email") ?? "").trim() &&
      !String(form.get("phone") ?? "").trim()
    ) {
      setFieldErrors({
        email: [t("contactRequired")],
        phone: [t("contactRequired")],
      });
      return;
    }
    if (signup && form.get("password") !== form.get("password_confirmation")) {
      setFieldErrors({ password_confirmation: [t("passwordMismatch")] });
      return;
    }
    try {
      const authenticatedUser = signup
        ? await register({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? "") || undefined,
            phoneCountryCode:
              String(form.get("phone_country_code") ?? "") || undefined,
            phone: String(form.get("phone") ?? "") || undefined,
            password: String(form.get("password") ?? ""),
            passwordConfirmation: String(
              form.get("password_confirmation") ?? "",
            ),
            accountType,
            profile:
              accountType === "individual"
                ? {
                    first_name: String(form.get("first_name") ?? ""),
                    last_name: String(form.get("last_name") ?? ""),
                    display_name: String(form.get("display_name") ?? ""),
                  }
                : accountType === "business"
                  ? {
                      legal_name: String(form.get("legal_name") ?? ""),
                      display_name: String(form.get("display_name") ?? ""),
                    }
                  : {
                      organization_name: String(
                        form.get("organization_name") ?? "",
                      ),
                      organization_type: String(
                        form.get("organization_type") ?? "",
                      ),
                      display_name: String(form.get("display_name") ?? ""),
                    },
          })
        : await login({
            identity: String(form.get("identity") ?? ""),
            password: String(form.get("password") ?? ""),
            remember: form.get("remember") === "on",
          });
      const redirect =
        safeNext &&
        (!isAdminPath(safeNext) || authenticatedUser.role === "superadmin")
          ? safeNext
          : dashboardPath(authenticatedUser);
      router.replace(withActiveLocale(redirect, pathname) as string);
    } catch (error) {
      const parsed = authErrors(error);
      setFieldErrors(parsed.fields);
      setGeneralError(
        Object.keys(parsed.fields).length ? null : parsed.message,
      );
    }
  }
  const title = signup ? t("registerTitle") : t("loginTitle");
  const errorFor = (...fields: string[]) =>
    fields
      .flatMap((field) => [field, `profile.${field}`])
      .flatMap((field) => fieldErrors[field] ?? [])[0];
  const input = (
    name: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <>
      <input name={name} {...props} aria-invalid={Boolean(errorFor(name))} />
      {errorFor(name) && (
        <small className={styles.fieldError} role="alert">
          {errorFor(name)}
        </small>
      )}
    </>
  );
  return (
    <main className={styles.page}>
      <div className={styles.alert}>
        <b>
          <Info size={23} /> {signup ? t("registerNotice") : t("loginNotice")}
        </b>
        <span>{signup ? t("registerDescription") : t("loginDescription")}</span>
      </div>
      <section className={styles.card}>
        <form onSubmit={submit}>
          <h1>{title}</h1>
          {generalError && (
            <p className={styles.formError} role="alert">
              {generalError}
            </p>
          )}
          {signup && (
            <>
              <label>
                {t("accountType")}
                <select
                  value={accountType}
                  aria-invalid={Boolean(errorFor("account_type"))}
                  onChange={(event) => {
                    if (isPublicAccountType(event.target.value))
                      setAccountType(event.target.value);
                  }}
                >
                  <option value="individual">{t("individual")}</option>
                  <option value="business">{t("business")}</option>
                  <option value="organization">{t("organization")}</option>
                </select>
                {errorFor("account_type") && (
                  <small className={styles.fieldError} role="alert">
                    {errorFor("account_type")}
                  </small>
                )}
              </label>
              <label>
                {t("fullName")}
                {input("name", { required: true, autoComplete: "name" })}
              </label>
              {accountType === "individual" ? (
                <>
                  <label>
                    {t("firstName")}
                    {input("first_name", { required: true })}
                  </label>
                  <label>
                    {t("lastName")}
                    {input("last_name")}
                  </label>
                </>
              ) : (
                <label>
                  {accountType === "business"
                    ? t("legalName")
                    : t("organizationName")}
                  {input(
                    accountType === "business"
                      ? "legal_name"
                      : "organization_name",
                    { required: true },
                  )}
                </label>
              )}
              <label>
                {t("displayName")}
                {input("display_name", { required: true })}
              </label>
              {accountType === "organization" ? (
                <label>
                  {t("organizationType")}
                  {input("organization_type")}
                </label>
              ) : null}
              <label>
                {t("phoneCountryCode")}
                {input("phone_country_code", { placeholder: "+93" })}
              </label>
              <label>
                {t("phone")}
                {input("phone", { type: "tel" })}
              </label>
            </>
          )}
          <label>
            {t("email")}
            {input(signup ? "email" : "identity", {
              required: !signup,
              type: signup ? "email" : "text",
              autoComplete: "email",
            })}
            {!signup && errorFor("email") && (
              <small className={styles.fieldError} role="alert">
                {errorFor("email")}
              </small>
            )}
          </label>
          <label>
            {t("password")}
            {!signup && (
              <Link href="/forgot-password">{t("forgotPassword")}</Link>
            )}
            {input("password", {
              required: true,
              type: "password",
              autoComplete: signup ? "new-password" : "current-password",
              minLength: 8,
            })}
          </label>
          {signup && (
            <label>
              {t("confirmPassword")}
              {input("password_confirmation", {
                required: true,
                type: "password",
                autoComplete: "new-password",
                minLength: 8,
              })}
            </label>
          )}
          <label className={styles.check}>
            <input name="remember" type="checkbox" />{" "}
            {signup ? t("agreement") : t("keepSignedIn")}
          </label>
          <button disabled={isAuthenticating || isLoading}>
            {isAuthenticating
              ? t("loading")
              : signup
                ? t("register")
                : t("login")}
          </button>
          <div className={styles.divide}>
            {signup ? t("alreadyHaveAccount") : t("newToMalik")}
          </div>
          <Link
            className={styles.outline}
            href={signup ? "/login" : "/register"}
          >
            {signup ? t("loginTitle") : t("register")}
          </Link>
        </form>
        <aside>
          <div className={styles.qr}>
            <QrCode size={122} strokeWidth={1.5} />
          </div>
          <h2>{t("secureAccess")}</h2>
          <p>{t("secureAccessDescription")}</p>
        </aside>
      </section>
    </main>
  );
}
