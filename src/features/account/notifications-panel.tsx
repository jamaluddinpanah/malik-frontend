"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { Bell, CheckCheck } from "lucide-react";
import { Toast } from "@/shared/ui";

type NotificationItem = { id: string; read_at: string | null; created_at: string; data?: { title?: string; message?: string } };
type NotificationResponse = { data: { data: NotificationItem[]; next_cursor?: string | null } };

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: "success" | "danger" } | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  async function load(cursor?: string) {
    try {
      const [response, preferences] = await Promise.all([
        apiClient.request<NotificationResponse>(`${routes.api.notifications}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
        apiClient.request<{ data: { notification_type: string; in_app_enabled: boolean | number }[] }>(routes.api.notificationPreferences),
      ]);
      setItems((current) => cursor ? [...current, ...response.data.data] : response.data.data);
      setNextCursor(response.data.next_cursor ?? null);
      const messagePreference = preferences.data.find((preference) => preference.notification_type === "messages");
      if (messagePreference) setMessageNotifications(Boolean(messagePreference.in_app_enabled));
    } catch { setError(true); } finally { setLoading(false); setLoadingMore(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  async function readAll() { await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationsReadAll, { method: "POST" }); setItems((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() }))); setNotice({ title: "Notifications read", message: "All notifications were marked as read.", tone: "success" }); }
  async function toggleMessageNotifications(enabled: boolean) {
    const previous = messageNotifications;
    setMessageNotifications(enabled);
    try {
      await apiClient.csrfCookie();
      await apiClient.request(routes.api.notificationPreference("messages"), { method: "PATCH", body: { in_app_enabled: enabled } });
      setNotice({ title: "Notification settings updated", message: enabled ? "Message notifications are now on." : "Message notifications are now off.", tone: "success" });
    } catch {
      setMessageNotifications(previous);
      setNotice({ title: "Could not update notifications", message: "Please try again.", tone: "danger" });
    }
  }
  return <section className="settings-panel notifications-panel">{notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}<header><div><span className="notifications-eyebrow"><Bell size={14} /> Account updates</span><h1>Notifications</h1><p>Stay up to date with your listings, messages, and account activity.</p></div><button type="button" onClick={() => void readAll()}><CheckCheck size={15} /> Mark all as read</button></header><label className="notification-preference"><span><b>Message notifications</b><small>Receive new message alerts in your account.</small></span><input type="checkbox" checked={messageNotifications} onChange={(event) => void toggleMessageNotifications(event.target.checked)} /></label>{loading ? <p className="notification-state" role="status">Loading notifications...</p> : error ? <p className="notification-state" role="alert">Notifications could not be loaded.</p> : !items.length ? <div className="notification-empty"><Bell size={28} /><b>No notifications yet</b><p>New updates about your account will appear here.</p></div> : <><div className="notification-list">{items.map((item) => <button type="button" className={item.read_at ? "notification-item" : "notification-item unread"} key={item.id} onClick={async () => { await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationRead(item.id), { method: "POST" }); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry)); setNotice({ title: "Notification read", message: "The notification was marked as read.", tone: "success" }); }}><span className="notification-icon"><Bell size={16} /></span><span className="notification-copy"><b>{item.data?.title ?? "Notification"}</b><small>{item.data?.message ?? ""}</small><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></span>{!item.read_at ? <i aria-label="Unread" /> : null}</button>)}</div>{nextCursor ? <button type="button" className="notification-load-more" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(nextCursor); }}>{loadingMore ? "Loading..." : "Load more"}</button> : null}</>}</section>;
}
