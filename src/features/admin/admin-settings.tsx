"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { adminPermissions } from "@/features/auth/permissions";
import { ApiError, apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { Button, Switch, Toast } from "@/shared/ui";
import type { LaravelCursorPagination } from "@/shared/types/api";
import styles from "./admin-settings.module.css";

type Setting = { group_name: string; setting_key: string; value: unknown; is_public: boolean };
type Notice = { title: string; message: string; tone: "success" | "danger" };
type NumberKey = "listings.default_duration" | "listings.view_deduplication_minutes" | "media.maximum_upload_size";
type BooleanKey = "contact.require_login_for_phone";
type Key = NumberKey | BooleanKey;
type Values = Record<Key, string | boolean>;

const definitions: { group: string; key: Key; title: string; description: string; unit?: string; defaultValue: string | boolean }[] = [
  { group: "Listings", key: "listings.default_duration", title: "Default listing duration", description: "Listing expiry duration.", unit: "days", defaultValue: "30" },
  { group: "Listings", key: "listings.view_deduplication_minutes", title: "Repeat-view window", description: "Per-viewer repeat-view analytics window.", unit: "minutes", defaultValue: "60" },
  { group: "Privacy", key: "contact.require_login_for_phone", title: "Sign-in required for phone reveal", description: "Require sign-in before phone reveal.", defaultValue: true },
  { group: "Media", key: "media.maximum_upload_size", title: "Maximum upload size", description: "Maximum banner/listing upload size.", unit: "KB", defaultValue: "10240" },
];

const defaultValues = Object.fromEntries(definitions.map(({ key, defaultValue }) => [key, defaultValue])) as Values;

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Unable to save this setting. Please try again.";
}

export function AdminSettings() {
  const { can } = useAuth();
  const mayManage = can(adminPermissions.settingsManage);
  const [values, setValues] = useState<Values>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<Key | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Key, string>>>({});
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const settings: Setting[] = [];
      let cursor: string | null = null;
      do {
        const query = new URLSearchParams({ per_page: "100" });
        if (cursor) query.set("cursor", cursor);
        const response = await apiClient.request<{ data: LaravelCursorPagination<Setting> }>(`${routes.api.admin.settings}?${query}`);
        settings.push(...response.data.data);
        cursor = response.data.next_cursor;
      } while (cursor);
      return settings;
    };
    void load()
      .then((settings) => {
        if (!active) return;
        const stored = new Map(settings.map((setting) => [`${setting.group_name}.${setting.setting_key}`, setting.value]));
        setValues(Object.fromEntries(definitions.map(({ key, defaultValue }) => {
          const value = stored.get(key);
          return [key, typeof defaultValue === "boolean" ? typeof value === "boolean" ? value : defaultValue : typeof value === "number" && Number.isInteger(value) && value > 0 ? String(value) : defaultValue];
        })) as Values);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorMessage(error));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const change = (key: Key, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = async (key: Key) => {
    if (!mayManage) return;
    const value = values[key];
    let payloadValue: number | boolean;
    if (typeof value === "string") {
      const number = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1) {
        setFieldErrors((current) => ({ ...current, [key]: "Enter a positive whole number." }));
        return;
      }
      payloadValue = number;
    } else {
      payloadValue = value;
    }
    setSaving(key);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    try {
      const [group, settingKey] = key.split(".");
      await apiClient.request(`${routes.api.admin.settings}/${group}/${settingKey}`, {
        method: "PUT",
        body: { value: payloadValue, is_public: false },
      });
      setNotice({ title: "Settings updated", message: "Your changes have been saved.", tone: "success" });
    } catch (error) {
      const inline = error instanceof ApiError ? error.errors.value?.[0] : undefined;
      if (inline) setFieldErrors((current) => ({ ...current, [key]: inline }));
      setNotice({ title: "Settings not saved", message: errorMessage(error), tone: "danger" });
    } finally {
      setSaving(null);
    }
  };

  return <AdminPageGuard permission={adminPermissions.settings}>
    <section className={styles.page}>
      {notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}
      <header className={styles.hero}>
        <div className={styles.heading}><span className={styles.icon}><Settings2 size={21} /></span><div><h1>Settings</h1><p>Control marketplace defaults, privacy, and media limits.</p></div></div>
      </header>
      {loading ? <div className={styles.state}>Loading settings...</div> : loadError ? <div className={styles.state} role="alert"><p>{loadError}</p><Button onClick={() => window.location.reload()}>Try again</Button></div> : ["Listings", "Privacy", "Media"].map((group) => <section className={styles.group} key={group}>
        <h2>{group}</h2>
        <div className={styles.card}>{definitions.filter((definition) => definition.group === group).map((definition) => <div className={styles.row} key={definition.key}>
          <div className={styles.copy}><h3>{definition.title}</h3><p>{definition.description}</p></div>
          <div className={styles.control}>{definition.unit ? <label><span>Value ({definition.unit})</span><div className={styles.number}><input type="number" min="1" step="1" inputMode="numeric" value={values[definition.key] as string} onChange={(event) => change(definition.key, event.target.value)} disabled={!mayManage} aria-invalid={Boolean(fieldErrors[definition.key])} aria-describedby={fieldErrors[definition.key] ? `${definition.key}-error` : undefined} /><b>{definition.unit}</b></div></label> : <Switch label="Require sign-in" description={values[definition.key] ? "Enabled" : "Disabled"} checked={values[definition.key] as boolean} onCheckedChange={(checked) => change(definition.key, checked)} disabled={!mayManage} />}{fieldErrors[definition.key] ? <small className={styles.error} id={`${definition.key}-error`}>{fieldErrors[definition.key]}</small> : null}</div>
          {mayManage ? <Button size="sm" onClick={() => void save(definition.key)} disabled={saving === definition.key}>{saving === definition.key ? "Saving..." : "Save"}</Button> : null}
        </div>)}</div>
      </section>)}</section>
    </AdminPageGuard>;
}
