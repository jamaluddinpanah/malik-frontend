"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { adminPermissions } from "@/features/auth/permissions";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { ConfirmationDialog, Toast } from "@/shared/ui";
import styles from "./admin-reports.module.css";

type Report = { id: number; reportable_type: string; reportable_id: number; status: string; details?: string | null; reporter_name?: string | null; messaging_disabled_at?: string | null };
type Page = { data: Report[]; next_cursor: string | null; prev_cursor: string | null };

export function AdminReports() {
  const [page, setPage] = useState<Page | null>(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: "success" | "danger" } | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (status) query.set("status", status);
      if (type) query.set("reportable_type", type);
      if (cursor) query.set("cursor", cursor);
      const response = await apiClient.request<{ data: Page; meta: { total: number } }>(`${routes.api.admin.reports}?${query}`);
      setPage(response.data);
      setTotal(response.meta.total);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 403 ? "You do not have permission to view reports." : "Reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [status, type, cursor]);
  async function decide(id: number, nextStatus: "reviewing" | "resolved" | "rejected" | "escalated", messaging?: "disable" | "enable") { try { await apiClient.csrfCookie(); await apiClient.request(routes.api.admin.report(id), { method: "PATCH", body: { status: nextStatus, disable_messaging: messaging === "disable", enable_messaging: messaging === "enable" } }); await load(); if (messaging) setNotice({ title: messaging === "disable" ? "Messaging disabled" : "Messaging enabled", message: messaging === "disable" ? "The reported user can no longer start or send messages." : "The user can send messages again.", tone: "success" }); } catch (reason) { setNotice({ title: "Action failed", message: reason instanceof ApiError ? reason.message : "The report could not be updated.", tone: "danger" }); } finally { setSelected(null); } }
  const isEnable = Boolean(selected?.messaging_disabled_at);
  const actionLabel = isEnable ? "Enable messaging" : "Disable messaging";
  const reports = page?.data ?? [];

  return <AdminPageGuard permission={adminPermissions.messagesModerate}><section className={styles.page}>{notice ? <Toast title={notice.title} message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} /> : null}{selected ? <ConfirmationDialog open title={actionLabel} confirmLabel={actionLabel} onClose={() => setSelected(null)} onConfirm={() => void decide(selected.id, "resolved", isEnable ? "enable" : "disable")}><p>{isEnable ? "Restore this user's ability to start and send messages?" : "Resolve this report and disable messaging for the reported user?"}</p></ConfirmationDialog> : null}<header className={styles.hero}><div><small>Administration / Reports</small><h1>Reports</h1><p>Review reported listings, users, messages, and conversations.</p></div></header><form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); setOffset(0); setCursor(null); }}><select value={status} onChange={(event) => { setOffset(0); setCursor(null); setStatus(event.target.value); }}><option value="">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select><select value={type} onChange={(event) => { setOffset(0); setCursor(null); setType(event.target.value); }}><option value="">All targets</option><option value="listing">Listings</option><option value="user">Users</option><option value="message">Messages</option><option value="conversation">Conversations</option></select><button type="submit">Apply filters</button></form>{loading ? <div className={styles.state}>Loading reports...</div> : error ? <div className={`${styles.state} ${styles.error}`}><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div> : !reports.length ? <div className={styles.state}>No reports found.</div> : <><div className={styles.table}><table><thead><tr><th>Count</th><th>Type</th><th>Reporter</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead><tbody>{reports.map((report, index) => <tr key={report.id}><td>{offset + index + 1}</td><td>{report.reportable_type}</td><td>{report.reporter_name ?? "-"}</td><td>{report.status}</td><td>{report.details ?? "-"}</td><td><button type="button" onClick={() => void decide(report.id, "reviewing")}>Review</button><button type="button" onClick={() => setSelected(report)}>{report.messaging_disabled_at ? "Enable messaging" : "Disable messaging"}</button></td></tr>)}</tbody></table></div><nav className={styles.pagination} aria-label="Reports pagination"><span>{total} logs</span><button type="button" disabled={!page?.prev_cursor} onClick={() => { setOffset((value) => Math.max(0, value - 10)); setCursor(page?.prev_cursor ?? null); }}>Previous</button><button type="button" disabled={!page?.next_cursor} onClick={() => { setOffset((value) => value + reports.length); setCursor(page?.next_cursor ?? null); }}>Next</button></nav></>}</section></AdminPageGuard>;
}
