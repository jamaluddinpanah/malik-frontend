"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { Toast } from "@/shared/ui";
import styles from "@/shared/ui/site-header.module.css";

type Item = { id: string; read_at: string | null; created_at: string; data?: { title?: string; message?: string; conversation_id?: number | string; url?: string } };
export function NotificationBell() {
  const t = useTranslations("navigation");
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markRead = async (id: string) => { await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationRead(id), { method: "POST" }); setItems((current) => current.filter((item) => item.id !== id)); setUnread((current) => Math.max(0, current - 1)); setNotice(true); };
  const markAllRead = async () => { await apiClient.csrfCookie(); await apiClient.request(routes.api.notificationsReadAll, { method: "POST" }); setItems([]); setUnread(0); setNotice(true); };
  const target = (item: Item) => item.data?.url ?? (item.data?.conversation_id ? `/my-account/messages?conversation=${item.data.conversation_id}` : "/my-account/notifications");
  useEffect(() => { const load = () => void apiClient.request<{ data: { data: Item[] }; unread_count: number }>(`${routes.api.notifications}?unread=1`).then((response) => { setItems(response.data.data.slice(0, 10)); setUnread(response.unread_count); }).catch(() => undefined); load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  return <div className={styles.notificationBell} ref={ref}>{notice ? <Toast title="Notification read" message="The notification was marked as read." tone="success" onDismiss={() => setNotice(false)} /> : null}<button type="button" aria-label={t("notifications")} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={17} />{unread ? <span>{unread > 99 ? "99+" : unread}</span> : null}</button>{open ? <div className={styles.notificationDropdown}><strong>{t("notifications")}</strong>{items.length ? items.map((item) => <Link href={target(item)} key={item.id} onClick={() => { void markRead(item.id); setOpen(false); }} className={styles.unreadNotification}><b>{item.data?.title ?? t("notifications")}</b><small>{item.data?.message ?? ""}</small></Link>) : <p>{t("noNotifications")}</p>}<button type="button" onClick={() => { void markAllRead(); setOpen(false); }}>{t("markAllNotificationsRead")}</button><Link href="/my-account/notifications" onClick={() => setOpen(false)}>{t("viewAllNotifications")}</Link></div> : null}</div>;
}
