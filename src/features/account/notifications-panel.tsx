"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { Bell, CheckCheck } from "lucide-react";
import { Toast } from "@/shared/ui";

const PAGE_SIZE = 10;
type NotificationItem = { id: string; read_at: string | null; created_at: string; data?: { title?: string; message?: string } };
type NotificationResponse = { data: { data: NotificationItem[]; next_cursor?: string | null } };

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [firstPageItems, setFirstPageItems] = useState<NotificationItem[]>([]);
  const [firstPageCursor, setFirstPageCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: "success" | "danger" } | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(cursor?: string) {
    try {
      const notificationsUrl = routes.api.notifications + "?per_page=" + PAGE_SIZE + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
      const [response, preferences] = await Promise.all([
        apiClient.request<NotificationResponse>(notificationsUrl),
        cursor ? Promise.resolve(null) : apiClient.request<{ data: { notification_type: string; in_app_enabled: boolean | number }[] }>(routes.api.notificationPreferences),
      ]);
      const pageItems = response.data.data;
      if (cursor) setItems((current) => [...current, ...pageItems.filter((item) => !current.some((entry) => entry.id === item.id))]);
      else { setItems(pageItems); setFirstPageItems(pageItems); setFirstPageCursor(response.data.next_cursor ?? null); }
      setNextCursor(response.data.next_cursor ?? null);
      const messagePreference = preferences?.data.find((preference) => preference.notification_type === "messages");
      if (messagePreference) setMessageNotifications(Boolean(messagePreference.in_app_enabled));
      setError(false);
    } catch { setError(true); } finally { setLoading(false); setLoadingMore(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const receive = (event: Event) => {
      const notification = (event as CustomEvent<NotificationItem>).detail;
      const prepend = (current: NotificationItem[]) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, PAGE_SIZE);
      setItems(prepend); setFirstPageItems(prepend);
    };
    window.addEventListener("malik:notification", receive);
    return () => window.removeEventListener("malik:notification", receive);
  }, []);

  async function readAll() {
    await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationsReadAll, { method: "POST" });
    const read = (current: NotificationItem[]) => current.map((item) => ({ ...item, read_at: new Date().toISOString() }));
    setItems(read); setFirstPageItems(read); setNotice({ title: "Notifications read", message: "All notifications were marked as read.", tone: "success" });
  }
  async function toggleMessageNotifications(enabled: boolean) {
    const previous = messageNotifications; setMessageNotifications(enabled);
    try { await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationPreference("messages"), { method: "PATCH", body: { in_app_enabled: enabled } }); setNotice({ title: "Notification settings updated", message: enabled ? "Message notifications are now on." : "Message notifications are now off.", tone: "success" }); }
    catch { setMessageNotifications(previous); setNotice({ title: "Could not update notifications", message: "Please try again.", tone: "danger" }); }
  }
  const markRead = async (id: string) => {
    await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationRead(id), { method: "POST" });
    const readAt = new Date().toISOString(); const update = (current: NotificationItem[]) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item);
    setItems(update); setFirstPageItems(update); setNotice({ title: "Notification read", message: "The notification was marked as read.", tone: "success" });
  };
  const hasExpanded = items.length > firstPageItems.length;
  const showLess = () => { setItems(firstPageItems); setNextCursor(firstPageCursor); };

  return <section className="settings-panel notifications-panel">{notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}<header><div><span className="notifications-eyebrow"><Bell size={14} /> Account updates</span><h1>Notifications</h1><p>Stay up to date with your listings, messages, and account activity.</p></div><button type="button" onClick={() => void readAll()}><CheckCheck size={15} /> Mark all as read</button></header><label className="notification-preference"><span><b>Message notifications</b><small>Receive new message alerts in your account.</small></span><input type="checkbox" checked={messageNotifications} onChange={(event) => void toggleMessageNotifications(event.target.checked)} /></label>{loading ? <p className="notification-state" role="status">Loading notifications...</p> : error ? <p className="notification-state" role="alert">Notifications could not be loaded.</p> : !items.length ? <div className="notification-empty"><Bell size={28} /><b>No notifications yet</b><p>New updates about your account will appear here.</p></div> : <><div className="notification-list">{items.map((item) => <button type="button" className={item.read_at ? "notification-item" : "notification-item unread"} key={item.id} onClick={() => void markRead(item.id)}><span className="notification-icon"><Bell size={16} /></span><span className="notification-copy"><b>{item.data?.title ?? "Notification"}</b><small>{item.data?.message ?? ""}</small><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></span>{!item.read_at ? <i aria-label="Unread" /> : null}</button>)}</div>{nextCursor || hasExpanded ? <div className="notification-pagination">{hasExpanded ? <button type="button" onClick={showLess}>Show less</button> : null}{nextCursor ? <button type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(nextCursor); }}>{loadingMore ? "Loading..." : "Show more"}</button> : null}</div> : null}</>}</section>;
}
