"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth, authErrors } from "./auth-provider";
import styles from "@/features/auth/auth-card.module.css";
import { RichTextEditor } from "@/shared/ui";

function profileDisplayName(profile: Record<string, unknown> | null): string {
  return typeof profile?.display_name === "string" ? profile.display_name : "";
}

function profileValue(
  profile: Record<string, unknown> | null,
  key: string,
): string {
  return typeof profile?.[key] === "string" ? profile[key] : "";
}

function ProfileRichTextField({ name, value }: { name: string; value: string }) {
  const [content, setContent] = useState(value);
  return <><RichTextEditor value={content} onChange={setContent} /><input name={name} type="hidden" value={content} /></>;
}

export function ProfileSettingsForm() {
  const t = useTranslations("account");
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
        gender: String(form.get("gender") || ""), date_of_birth: String(form.get("date_of_birth") || ""), bio: String(form.get("bio") || ""), address: String(form.get("address") || ""),
      };
    if (accountType === "business")
      profile = {
        display_name: String(form.get("display_name")),
        legal_name: String(form.get("legal_name")),
        registration_number: String(form.get("registration_number") || ""), tax_number: String(form.get("tax_number") || ""), business_type: String(form.get("business_type") || ""), description: String(form.get("description") || ""), website_url: String(form.get("website_url") || ""), address: String(form.get("address") || ""), latitude: String(form.get("latitude") || ""), longitude: String(form.get("longitude") || ""),
      };
    if (accountType === "organization")
      profile = {
        organization_name: String(form.get("organization_name")),
        organization_type: String(form.get("organization_type") || ""),
        employee_size: String(form.get("employee_size") || ""), registration_number: String(form.get("registration_number") || ""), description: String(form.get("description") || ""), website_url: String(form.get("website_url") || ""), contact_email: String(form.get("contact_email") || ""), contact_phone: String(form.get("contact_phone") || ""), address: String(form.get("address") || ""), latitude: String(form.get("latitude") || ""), longitude: String(form.get("longitude") || ""),
      };
    try {
      await updateProfile({
        name: String(form.get("name")),
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
        <label>
          Gender
          <select
            name="gender"
            defaultValue={profileValue(user.profile, "gender")}
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label>
          Date of birth
          <input
            name="date_of_birth"
            type="date"
            defaultValue={profileValue(user.profile, "date_of_birth")}
          />
        </label>
        <div className={`${styles.fullField} ${styles.richTextField}`}>
          <span>Bio</span>
          <ProfileRichTextField name="bio" value={profileValue(user.profile, "bio")} />
        </div>
        <label className={styles.fullField}>
          Address
          <textarea name="address" defaultValue={profileValue(user.profile, "address")} />
        </label>
      </>
    ) : accountType === "business" ? (
      <>
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
      <label>Registration number<input name="registration_number" defaultValue={profileValue(user.profile, "registration_number")} /></label><label>Tax number<input name="tax_number" defaultValue={profileValue(user.profile, "tax_number")} /></label><label>Business type<input name="business_type" defaultValue={profileValue(user.profile, "business_type")} /></label><label>Website<input name="website_url" type="url" defaultValue={profileValue(user.profile, "website_url")} /></label><div className={`${styles.fullField} ${styles.richTextField}`}><span>Description</span><ProfileRichTextField name="description" value={profileValue(user.profile, "description")} /></div><label className={styles.fullField}>Address<textarea name="address" defaultValue={profileValue(user.profile, "address")} /></label><label>Latitude<input name="latitude" type="number" step="any" defaultValue={profileValue(user.profile, "latitude")} /></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={profileValue(user.profile, "longitude")} /></label></>
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
        <label>Employee size<input name="employee_size" defaultValue={profileValue(user.profile, "employee_size")} /></label><label>Registration number<input name="registration_number" defaultValue={profileValue(user.profile, "registration_number")} /></label><label>Website<input name="website_url" type="url" defaultValue={profileValue(user.profile, "website_url")} /></label><label>Contact email<input name="contact_email" type="email" defaultValue={profileValue(user.profile, "contact_email")} /></label><label>Contact phone<input name="contact_phone" defaultValue={profileValue(user.profile, "contact_phone")} /></label><div className={`${styles.fullField} ${styles.richTextField}`}><span>Description</span><ProfileRichTextField name="description" value={profileValue(user.profile, "description")} /></div><label className={styles.fullField}>Address<textarea name="address" defaultValue={profileValue(user.profile, "address")} /></label><label>Latitude<input name="latitude" type="number" step="any" defaultValue={profileValue(user.profile, "latitude")} /></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={profileValue(user.profile, "longitude")} /></label>
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
      <section className={`${styles.card} ${styles.profileCard}`}>
        <form className={styles.profileForm} onSubmit={submit}>
          <h1>{t("profile")}</h1>
          {message ? <p role="status">{message}</p> : null}
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
          <label className={styles.fullField}>
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
            <label className={styles.fullField}>
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
