"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmationDialog, Toast } from "@/shared/ui";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { leaveRealtime, realtime } from "@/shared/lib/realtime/echo";

type Conversation = { id: number; listing_title?: string; listing_slug?: string; other_user?: { id: number; name: string }; unread_count: number; muted: boolean };
type Message = { id: number; sender_id: number; body?: string | null; created_at: string; reply_to_id?: number | null };
type MessagePage = { data: { data: Message[]; next_cursor?: string | null } };

export function MessagesPortal() {
  const t = useTranslations("accountDashboard");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pendingAction, setPendingAction] = useState<"mute" | "leave" | "block" | "report" | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: "success" | "danger" } | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const messagesBody = useRef<HTMLDivElement>(null);
  const pendingBottomScroll = useRef<number | null>(null);

  async function loadConversations() {
    try {
      const requested = Number(searchParams.get("conversation"));
      const response = await apiClient.request<{ data: { data: Conversation[] } }>(requested ? `${routes.api.conversations}?conversation=${requested}` : routes.api.conversations);
      const items = response.data.data;
      setConversations(items);
      setSelected((current) => current ? items.find((item) => item.id === current.id) ?? current : items.find((item) => item.id === requested) ?? null);
    } catch { setError(t("messagesLoadError")); } finally { setLoading(false); }
  }

  async function loadMessages(id: number, reset = true) {
    try {
      const response = await apiClient.request<MessagePage>(routes.api.conversationMessages(id));
      const incoming = [...response.data.data].reverse();
      setMessages((current) => reset ? incoming : [...new Map([...current, ...incoming].map((message) => [message.id, message])).values()]);
      if (reset) {
        setMessagesCursor(response.data.next_cursor ?? null);
        pendingBottomScroll.current = id;
      }
      await apiClient.csrfCookie();
      await apiClient.request(routes.api.conversationRead(id), { method: "POST" });
      setConversations((items) => items.map((item) => item.id === id ? { ...item, unread_count: 0 } : item));
    } catch { setError(t("messagesLoadError")); }
  }

  async function loadOlderMessages() {
    if (!selected || !messagesCursor || loadingOlder || !messagesBody.current) return;
    const previousHeight = messagesBody.current.scrollHeight;
    setLoadingOlder(true);
    try {
      const response = await apiClient.request<MessagePage>(`${routes.api.conversationMessages(selected.id)}?cursor=${encodeURIComponent(messagesCursor)}`);
      const older = [...response.data.data].reverse();
      setMessages((current) => [...new Map([...older, ...current].map((message) => [message.id, message])).values()]);
      setMessagesCursor(response.data.next_cursor ?? null);
      requestAnimationFrame(() => { if (messagesBody.current) messagesBody.current.scrollTop += messagesBody.current.scrollHeight - previousHeight; });
    } catch { setError(t("messagesLoadError")); } finally { setLoadingOlder(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadConversations(), 0); return () => window.clearTimeout(timer); }, [searchParams]);
  useEffect(() => { if (!selected) return; const timer = window.setTimeout(() => void loadMessages(selected.id), 0); return () => window.clearTimeout(timer); }, [selected?.id]);
  useEffect(() => { const refresh = () => void loadConversations(); window.addEventListener("malik:message", refresh); window.addEventListener("malik:notification", refresh); return () => { window.removeEventListener("malik:message", refresh); window.removeEventListener("malik:notification", refresh); }; }, [searchParams]);
  useEffect(() => { if (!selected) return; const channel = `conversation.${selected.id}`; realtime()?.private(channel).listen(".message.created", ({ message }: { message: Message }) => { pendingBottomScroll.current = selected.id; setMessages((current) => [...new Map([...current, message].map((item) => [item.id, item])).values()]); if (message.sender_id !== user?.id) { void apiClient.csrfCookie().then(() => apiClient.request(routes.api.conversationRead(selected.id), { method: "POST" })); setConversations((items) => items.map((item) => item.id === selected.id ? { ...item, unread_count: 0 } : item)); } }); return () => leaveRealtime(channel); }, [selected?.id, user?.id]);
  useEffect(() => { if (selected && pendingBottomScroll.current === selected.id) { messagesBody.current?.scrollTo({ top: messagesBody.current.scrollHeight }); pendingBottomScroll.current = null; } }, [messages, selected]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    const form = new FormData();
    form.set("body", body.trim());
    if (reply) form.set("reply_to_id", String(reply.id));
    try { await apiClient.csrfCookie(); const response = await apiClient.request<{ data: Message }>(routes.api.conversationMessages(selected.id), { method: "POST", body: form }); pendingBottomScroll.current = selected.id; setMessages((current) => [...new Map([...current, response.data].map((message) => [message.id, message])).values()]); setBody(""); setReply(null); } catch { setError(t("messageSendError")); }
  }

  async function executeAction(path: string, body?: Record<string, string>) { if (!selected) return; await apiClient.csrfCookie(); await apiClient.request(path, { method: "POST", body }); await loadConversations(); }
  function action(path: string) { if (path === routes.api.conversationMute(selected?.id ?? 0)) setPendingAction("mute"); else if (path === routes.api.conversationLeave(selected?.id ?? 0)) setPendingAction("leave"); else setPendingAction("report"); }
  async function executeBlock() { if (!selected?.other_user?.id) return; const wasBlocked = blocked; const userId = selected.other_user.id; await apiClient.csrfCookie(); await apiClient.request(routes.api.userBlock(userId), { method: wasBlocked ? "DELETE" : "POST" }); setBlocked(!wasBlocked); if (!wasBlocked) { setConversations((items) => items.filter((item) => item.other_user?.id !== userId)); setSelected(null); setMessages([]); router.replace(pathname, { scroll: false }); } }
  function toggleBlock() { setPendingAction("block"); }
  async function confirmAction() {
    if (!selected || !pendingAction) return;
    const current = pendingAction;
    if (current === "report" && !reportDetails.trim()) { setNotice({ title: "Report details required", message: "Describe the problem for the administrator.", tone: "danger" }); return; }
    try {
      if (current === "mute") await executeAction(routes.api.conversationMute(selected.id));
      if (current === "leave") await executeAction(routes.api.conversationLeave(selected.id));
      if (current === "block") await executeBlock();
      if (current === "report") await executeAction(routes.api.conversationReport(selected.id), { details: reportDetails.trim() });
      setNotice({ title: "Conversation updated", message: current === "report" ? "The conversation was reported." : `${current === "mute" ? (selected.muted ? "Conversation unmuted." : "Conversation muted.") : current === "leave" ? "You left the conversation." : blocked ? "User unblocked." : "User blocked."}`, tone: "success" });
    } catch { setNotice({ title: "Action failed", message: "Please try again.", tone: "danger" }); } finally { setPendingAction(null); setReportDetails(""); }
  }

  if (loading) return <section className="messages-portal"><p role="status">{t("messagesLoading")}</p></section>;
  const filtered = conversations.filter((item) => `${item.other_user?.name ?? ""} ${item.listing_title ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
  const actionLabel = pendingAction === "mute" ? (selected?.muted ? t("unmute") : t("mute")) : pendingAction === "leave" ? t("leaveConversation") : pendingAction === "block" ? (blocked ? t("unblockUser") : t("blockUser")) : t("reportConversation");
  return <section className="messages-portal">{notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}{pendingAction ? <ConfirmationDialog open onClose={() => { setPendingAction(null); setReportDetails(""); }} title={actionLabel} confirmLabel={actionLabel} onConfirm={() => void confirmAction()}>{pendingAction === "report" ? <label className="report-details"><b>What happened?</b><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={2000} placeholder="Describe the issue for the administrator..." /></label> : <p>Are you sure you want to {actionLabel.toLocaleLowerCase()}?</p>}</ConfirmationDialog> : null}
    <aside className="messages-list"><h1>{t("messagesTitle")}</h1><input className="messages-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchMessages")} aria-label={t("searchMessages")} />{error ? <p role="alert">{error}</p> : null}{filtered.map((item) => <button type="button" className={selected?.id === item.id ? "selected" : ""} key={item.id} onClick={() => { setBlocked(false); setSelected(item); router.replace(`${pathname}?conversation=${item.id}`, { scroll: false }); }}><b>{item.other_user?.name ?? t("messagesTitle")}</b><small>{item.listing_title ?? t("listingManagement")}{item.unread_count ? ` · ${item.unread_count}` : ""}</small></button>)}{!filtered.length ? <p>{search ? t("noMatchingConversations") : t("noConversations")}</p> : null}</aside>
    <div className="messages-thread">{selected ? <><header><div><h2>{selected.other_user?.name}</h2>{selected.listing_slug ? <Link href={`/listing/${selected.listing_slug}`}>{selected.listing_title}</Link> : null}</div><div><button type="button" onClick={() => void action(routes.api.conversationMute(selected.id))}>{selected.muted ? t("unmute") : t("mute")}</button><button type="button" onClick={() => void action(routes.api.conversationLeave(selected.id))}>{t("leaveConversation")}</button><button type="button" onClick={() => void toggleBlock()}>{blocked ? t("unblockUser") : t("blockUser")}</button><button type="button" onClick={() => void action(routes.api.conversationReport(selected.id))}>{t("reportConversation")}</button></div></header><div className="messages-body" ref={messagesBody}>{messagesCursor ? <button className="messages-load-older" type="button" title={t("loadOlderMessages")} aria-label={t("loadOlderMessages")} disabled={loadingOlder} onClick={() => void loadOlderMessages()}><RefreshCw size={16} className={loadingOlder ? "messages-syncing" : ""} /></button> : null}{messages.map((message) => { const own = message.sender_id === user?.id; return <article className={own ? "own" : "other"} key={message.id} onClick={() => setReply(message)}><small>{own ? t("yourMessage") : selected.other_user?.name} · {new Date(message.created_at).toLocaleString()}</small>{message.reply_to_id ? <em>{t("replyTo", { id: message.reply_to_id })}</em> : null}<p>{message.body}</p></article>; })}</div><form onSubmit={send}>{reply ? <button type="button" onClick={() => setReply(null)}>{t("replyTo", { id: reply.id })}</button> : null}<textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.altKey && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={t("messagePlaceholder")} /><button type="submit">{t("sendMessage")}</button></form></> : <div className="messages-empty">{t("selectConversation")}</div>}</div>
  </section>;
}
