"use client";
/* eslint-disable react-hooks/exhaustive-deps -- Effects use stable Effect Events and derived status keys. */
/* eslint-disable @next/next/no-img-element -- Moderation media may use user-provided hosts that cannot be statically allowlisted. */

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ClipboardCheck, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { ApiError } from "@/shared/lib/api";
import { adminPermissions } from "@/features/auth/permissions";
import { useAuth } from "@/features/auth/auth-provider";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { ForbiddenState } from "@/shared/ui/feedback";
import { ConfirmationDialog, Dialog, RichText, Toast } from "@/shared/ui";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { VehicleBodyConditionMap } from "@/features/catalog/vehicle-body-condition-map";
import {
  AdminRepository,
  type AdminModerationDetail,
  type AdminModerationItem,
  type AiImageReview,
  type AiReview,
  type AiReviewFinding,
  type CursorPage,
} from "@/features/admin/admin-repository";
import styles from "./admin-moderation.module.css";

const repository = new AdminRepository();
const locales = ["en", "fa", "ps"] as const;

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? Object.values(error.errors).flat()[0] ?? error.message
    : fallback;
}

function displayValue(value: string | number | boolean | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function aiRisk(summary?: { risk?: string | null; risk_level?: string | null; aggregate_risk?: string | null } | null) {
  return (summary?.aggregate_risk ?? summary?.risk ?? summary?.risk_level ?? "").toLowerCase();
}

function isHighRisk(summary?: { risk?: string | null; risk_level?: string | null; aggregate_risk?: string | null } | null) {
  return ["high", "high_risk", "critical"].includes(aiRisk(summary));
}

function findingText(finding: AiReviewFinding | string) {
  if (typeof finding === "string") return finding;
  return finding.message ?? finding.detected_label ?? finding.label ?? finding.flag ?? finding.code ?? finding.type ?? finding.description ?? "-";
}

function alertFlags(review?: AiReview | null) {
  return review?.flags ?? review?.data?.flags ?? [];
}

function alertCount(summary?: AdminModerationItem["ai_review_summary"] | AiReview | null) {
  return summary?.alert_count ?? summary?.flags?.length ?? (summary && "data" in summary ? summary.data?.flags?.length : 0) ?? 0;
}

function hasAiAlerts(summary?: AdminModerationItem["ai_review_summary"] | AiReview | null) {
  return alertCount(summary) > 0;
}

function isAiInProgress(summary?: AdminModerationItem["ai_review_summary"] | AiReview | null) {
  return ["analyzing", "queued", "pending", "running"].includes(summary?.status?.toLowerCase() ?? "");
}

function queueSummary(review: AiReview) {
  return { ...review, flags: review.flags ?? review.data?.flags };
}

function queueRiskLabel(summary: AdminModerationItem["ai_review_summary"] | AiReview | null | undefined, t: ReturnType<typeof useTranslations>) {
  const risk = aiRisk(summary);
  if (["high", "high_risk", "critical"].includes(risk)) return t("aiHighRisk");
  if (risk === "needs_review") return t("aiNeedsReview");
  if (["low", "clear", "safe"].includes(risk)) return t("analysisRiskLow");
  if (["medium", "moderate", "warning"].includes(risk)) return t("analysisRiskModerate");
  return t("analysisRiskUnknown");
}

function queueStatusLabel(summary: AdminModerationItem["ai_review_summary"] | AiReview | null | undefined, t: ReturnType<typeof useTranslations>) {
  const status = summary?.status?.toLowerCase();
  if (["queued", "pending"].includes(status ?? "")) return t("analysisStatusQueued");
  if (["analyzing", "running"].includes(status ?? "")) return t("analysisStatusAnalyzing");
  if (status === "completed") return t("analysisStatusCompleted");
  if (["failed", "error"].includes(status ?? "")) return t("analysisStatusFailed");
  return t("analysisStatusQueued");
}

function alertSeverity(summary?: AdminModerationItem["ai_review_summary"] | AiReview | null) {
  if ((summary?.high_alert_count ?? 0) > 0) return "high";
  if ((summary?.warning_alert_count ?? 0) > 0) return "warning";
  const flags = summary?.flags ?? (summary && "data" in summary ? summary.data?.flags : []);
  if (flags?.some((flag) => typeof flag !== "string" && /critical|high/i.test(flag.severity ?? ""))) return "high";
  if (flags?.some((flag) => typeof flag !== "string" && /warning|warn/i.test(flag.severity ?? ""))) return "warning";
  return "alert";
}

function aiErrorText(error: unknown, t: ReturnType<typeof useTranslations>) {
  const text = Array.isArray(error) ? error.join(", ") : String(error ?? "");
  return /api-inference\.huggingface\.co|could not resolve host|huggingface_token is not configured/i.test(text)
    ? t("aiUnavailableDescription")
    : text;
}

function AiBadge({ summary, t, onAlertClick }: { summary?: AdminModerationItem["ai_review_summary"]; t: ReturnType<typeof useTranslations>; onAlertClick?: () => void }) {
  if (!summary) return <span className={`${styles.aiBadge} ${styles.aiUnavailable}`}>{t("aiUnavailable")}</span>;
  const status = summary.status?.toLowerCase();
  if (status === "analyzing" || status === "queued" || status === "pending" || status === "running") return <span className={`${styles.aiBadge} ${styles.aiAnalyzing}`}><LoaderCircle size={12} /> {t("aiAnalyzing")}</span>;
  if (status === "failed" || status === "error") return <span className={`${styles.aiBadge} ${styles.aiFailed}`}>{t("aiFailed")}</span>;
  if (hasAiAlerts(summary)) {
    const severity = alertSeverity(summary);
    const className = `${styles.aiBadge} ${severity === "high" ? styles.aiHigh : severity === "warning" ? styles.aiWarning : styles.aiAlert}`;
    const label = `${t("aiAlertCount", { count: alertCount(summary) })} · ${t(`aiSeverity${severity[0].toUpperCase()}${severity.slice(1)}`)}`;
    return onAlertClick ? <button className={`${className} ${styles.aiBadgeButton}`} type="button" onClick={onAlertClick} aria-haspopup="dialog" aria-label={t("openAlertDetails", { count: alertCount(summary) })}>{label}</button> : <span className={className}>{label}</span>;
  }
  const risk = aiRisk(summary);
  const label = risk === "needs_review" ? t("aiNeedsReview").replace(/\s+Risk$/i, "") : isHighRisk(summary) ? t("aiHighRisk") : t("aiReviewed");
  return <span className={`${styles.aiBadge} ${isHighRisk(summary) ? styles.aiHigh : ""}`}>{label}</span>;
}

function UnrelatedImagesBadge({ summary, t }: { summary?: AdminModerationItem["ai_review_summary"]; t: ReturnType<typeof useTranslations> }) {
  const count = summary?.unrelated_image_count ?? 0;
  if (count <= 0) return null;
  return <span className={styles.unrelatedImagesBadge}>{t("unrelatedImages", { count })}</span>;
}

function categoryMatch(image: AiImageReview) {
  return image.category_match ?? "unknown";
}

export function AdminModerationQueue() {
  const t = useTranslations("adminModeration");
  const { user } = useAuth();
  const isSuperadmin = user?.roles.includes("superadmin") ?? false;
  const [page, setPage] = useState<CursorPage<AdminModerationItem> | null>(null);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [approveTarget, setApproveTarget] = useState<AdminModerationItem | null>(null);
  const [approveDuration, setApproveDuration] = useState("30");
  const [approving, setApproving] = useState(false);
  const [aiRiskFilter, setAiRiskFilter] = useState("");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisItems, setAnalysisItems] = useState<AdminModerationItem[] | null>(null);
  const [analysisResultsOpen, setAnalysisResultsOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState<AdminModerationItem | null>(null);
  const [alertReview, setAlertReview] = useState<AiReview | null>(null);
  const [alertMedia, setAlertMedia] = useState<AdminModerationDetail["media"]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<unknown>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkDuration, setBulkDuration] = useState("30");
  const [bulkAiOverride, setBulkAiOverride] = useState(false);
  const [bulkAiOverrideReason, setBulkAiOverrideReason] = useState("");
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const queueRequestRef = useRef(0);

  async function load(requestedCursor = cursor) {
    const request = ++queueRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await repository.moderationQueue({ q: applied, cursor: requestedCursor, aiRisk: aiRiskFilter });
      if (request !== queueRequestRef.current) return;
      setPage(response.data);
      setTotal(response.meta.total);
    } catch (reason) {
      if (request !== queueRequestRef.current) return;
      setError(reason);
    } finally {
      if (request === queueRequestRef.current) setLoading(false);
    }
  }

  const loadEvent = useEffectEvent(load);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvent(), 0);
    return () => window.clearTimeout(timer);
  }, [applied, cursor, aiRiskFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedIds([]);
      setBulkApproveOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applied, cursor, aiRiskFilter]);

  useEffect(() => {
    if (analysisItems?.some((item) => isAiInProgress(item.ai_review_summary))) return;
    if (!page?.data.some((item) => isAiInProgress(item.ai_review_summary))) return;
    const timer = window.setInterval(() => void loadEvent(), 3000);
    return () => window.clearInterval(timer);
  }, [page?.data, analysisItems, loadEvent]);

  const pollAnalysis = useEffectEvent(async () => {
      if (!analysisItems) return;
      const results = await Promise.allSettled(analysisItems.map(async (item) => ({ id: item.id, summary: queueSummary(await repository.moderationAiReview(item.id)) })));
      const reviews = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (!reviews.length) return;
      const summaries = new Map(reviews.map((review) => [review.id, review.summary]));
      const update = (item: AdminModerationItem) => summaries.has(item.id) ? { ...item, ai_review_summary: summaries.get(item.id) } : item;
      setAnalysisItems((current) => current?.map(update) ?? current);
      setPage((current) => current ? { ...current, data: current.data.map(update) } : current);
    });
  const analysisStatusKey = analysisItems?.map((item) => `${item.id}:${item.ai_review_summary?.status ?? ""}`).join(",");
  useEffect(() => {
    if (!analysisItems?.some((item) => isAiInProgress(item.ai_review_summary))) return;
    const initialPoll = window.setTimeout(() => void pollAnalysis(), 0);
    const timer = window.setInterval(() => void pollAnalysis(), 3000);
    return () => {
      window.clearTimeout(initialPoll);
      window.clearInterval(timer);
    };
  }, [analysisStatusKey]);

  async function analyzeCurrentPage() {
    if (!page?.data.length) return;
    setAnalyzing(true);
    setError(null);
    try {
      await repository.analyzeModeration(page.data.map((item) => item.id));
      setAnalyzeOpen(false);
      const queuedItems = page.data.map((item) => ({ ...item, ai_review_summary: { ...item.ai_review_summary, status: "queued" } }));
      setAnalysisItems(queuedItems);
      setPage((current) => current ? { ...current, data: current.data.map((item) => queuedItems.find((queued) => queued.id === item.id) ?? item) } : current);
      setAnalysisResultsOpen(true);
    } catch (failure) {
      setError(failure);
    } finally {
      setAnalyzing(false);
    }
  }

  async function approve() {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await repository.decideModeration(approveTarget.id, { decision: "approved", ...(isSuperadmin ? { duration_days: Number(approveDuration) } : {}) });
      setPage((current) => current ? { ...current, data: current.data.filter((item) => item.id !== approveTarget.id) } : current);
      setTotal((current) => Math.max(0, current - 1));
      setApproveTarget(null);
    } catch (failure) {
      setError(failure);
      setApproveTarget(null);
    } finally {
      setApproving(false);
    }
  }

  const selectedItems = page?.data.filter((item) => selectedIds.includes(item.id)) ?? [];
  const selectedAlertCount = selectedItems.filter((item) => hasAiAlerts(item.ai_review_summary) || isHighRisk(item.ai_review_summary)).length;
  const allVisibleSelected = Boolean(page?.data.length) && page!.data.every((item) => selectedIds.includes(item.id));
  const someVisibleSelected = Boolean(page?.data.some((item) => selectedIds.includes(item.id)));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  function toggleSelected(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  function toggleAllVisible() {
    if (!page) return;
    setSelectedIds(allVisibleSelected ? [] : page.data.map((item) => item.id));
  }

  async function bulkApprove() {
    if (!selectedIds.length || (selectedAlertCount > 0 && (!isSuperadmin || !bulkAiOverride || !bulkAiOverrideReason.trim()))) return;
    setBulkApproving(true);
    setError(null);
    try {
      const result = await repository.bulkApproveModeration({
        listing_ids: selectedIds,
        ...(isSuperadmin ? { duration_days: Number(bulkDuration) } : {}),
        ...(isSuperadmin && selectedAlertCount > 0 ? { ai_override_reason: bulkAiOverrideReason.trim() } : {}),
      });
      setBulkNotice(t("bulkApprovalResult", { approved: result.approved_listing_ids.length, skipped: result.skipped.length }));
      setSelectedIds([]);
      setBulkApproveOpen(false);
      setBulkAiOverride(false);
      setBulkAiOverrideReason("");
      setOffset(0);
      setCursor(null);
      void load(null);
    } catch (failure) {
      setError(failure);
    } finally {
      setBulkApproving(false);
    }
  }

  function openAlertDetails(item: AdminModerationItem) {
    const summary = item.ai_review_summary;
    const hasFlags = alertFlags(summary).length > 0;
    setAlertTarget(item);
    setAlertReview(hasFlags ? summary ?? null : null);
    setAlertMedia([]);
    setAlertError(null);
    setAlertLoading(!hasFlags);

    void (async () => {
      try {
        const review = hasFlags ? summary : await repository.moderationAiReview(item.id);
        if (!review) return;
        setAlertReview(review);
        const hasMediaAlert = alertFlags(review).some((alert) => typeof alert !== "string" && alert.media_id !== null && alert.media_id !== undefined);
        if (hasMediaAlert) {
          const result = await repository.moderationListing(item.id);
          setAlertMedia(result.listing.media ?? []);
        }
      } catch (failure) {
        setAlertError(failure);
      } finally {
        setAlertLoading(false);
      }
    })();
  }

  return (
    <AdminPageGuard permission={adminPermissions.listingsModerate}>
      <section className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heading}>
            <span className={styles.icon}><ClipboardCheck size={20} /></span>
            <div><small>{t("sectionLabel")}</small><h1>{t("title")}</h1><p>{t("description")}</p></div>
          </div>
          <span className={styles.statusBadge}>{t("pendingLabel")}</span>
        </header>
         <form className={`${styles.toolbar} ${styles.toolbarPanel}`} onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setCursor(null);
          setApplied(query);
        }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
          <select aria-label={t("aiFilter")} value={aiRiskFilter} onChange={(event) => { setOffset(0); setCursor(null); setAiRiskFilter(event.target.value); }}><option value="">{t("aiAll")}</option><option value="high">{t("aiHighRisk")}</option><option value="needs_review">{t("aiNeedsReview")}</option></select>
          <button type="submit">{t("searchAction")}</button>
           <button className={styles.analyzeButton} type="button" disabled={!page?.data.length || analyzing} onClick={() => setAnalyzeOpen(true)}>{analyzing ? t("aiAnalyzing") : t("analyzeCurrentPage")}</button>
         </form>
        {bulkNotice ? <Toast title={t("approved")} message={bulkNotice} tone="success" onDismiss={() => setBulkNotice(null)} /> : null}
        {loading ? <div className={styles.state}><LoaderCircle /> {t("loading")}</div> : error instanceof ApiError && error.status === 403 ? <ForbiddenState /> : error ? <div className={`${styles.state} ${styles.error}`}><p>{errorText(error, t("loadError"))}</p><button type="button" onClick={() => void load()}>{t("retry")}</button></div> : !page?.data.length ? <div className={styles.state}>{t("empty")}</div> : <>
          {selectedIds.length ? <div className={styles.bulkActions}><button type="button" onClick={() => setBulkApproveOpen(true)}>{t("approveSelected", { count: selectedIds.length })}</button></div> : null}
          <div className={styles.table}><table><thead><tr><th><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label={t("selectAllCurrentPage")} /></th><th>Count</th><th>{t("listing")}</th><th>{t("seller")}</th><th>{t("category")}</th><th>{t("aiReview")}</th><th>{t("submitted")}</th><th>{t("action")}</th></tr></thead><tbody>{page.data.map((item, index) => <tr key={item.id}><td><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} aria-label={t("selectListing", { listing: item.title })} /></td><td>{offset + index + 1}</td><td><Link href={`/admin/moderation/${item.id}`}>{item.title}</Link><small>{item.listing_number}</small></td><td>{item.owner?.name ?? "-"}</td><td>{item.category?.slug ?? "-"}</td><td><div className={styles.aiQueueIndicators}><AiBadge summary={item.ai_review_summary} t={t} onAlertClick={() => openAlertDetails(item)} /><UnrelatedImagesBadge summary={item.ai_review_summary} t={t} /></div></td><td>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "-"}</td><td><span className={styles.queueActions}><Link href={`/admin/moderation/${item.id}`}>{t("review")}</Link><button type="button" disabled={isHighRisk(item.ai_review_summary) || hasAiAlerts(item.ai_review_summary)} title={isHighRisk(item.ai_review_summary) || hasAiAlerts(item.ai_review_summary) ? t("aiApprovalBlocked") : undefined} onClick={() => setApproveTarget(item)}>{t("approved")}</button></span></td></tr>)}</tbody></table></div>
          <nav className={styles.pagination} aria-label={t("pagination")}><span>{total} items</span><button type="button" disabled={!page.prev_cursor} onClick={() => { setOffset((value) => Math.max(0, value - 10)); setCursor(page.prev_cursor); }}>{t("previous")}</button><button type="button" disabled={!page.next_cursor} onClick={() => { setOffset((value) => value + page.data.length); setCursor(page.next_cursor); }}>{t("next")}</button></nav>
        </>}
      </section>
      <ConfirmationDialog open={Boolean(approveTarget)} onClose={() => !approving && setApproveTarget(null)} title={t("confirmTitle")} confirmLabel={approving ? t("saving") : t("approved")} cancelLabel={t("cancel")} onConfirm={() => void approve()}>
        <p>{t("confirmDescription")}</p>
        {isSuperadmin ? <label className={`${styles.duration} ${styles.approvalDuration}`}><span>{t("duration")}</span><select value={approveDuration} onChange={(event) => setApproveDuration(event.target.value)} disabled={approving}><option value="7">{t("duration7")}</option><option value="30">{t("duration30")}</option><option value="90">{t("duration90")}</option><option value="365">{t("duration365")}</option></select></label> : null}
      </ConfirmationDialog>
      <ConfirmationDialog open={bulkApproveOpen} onClose={() => !bulkApproving && setBulkApproveOpen(false)} title={t("bulkApproveTitle")} confirmLabel={bulkApproving ? t("saving") : t("approved")} cancelLabel={t("cancel")} onConfirm={() => void bulkApprove()}>
        <p>{t("bulkApproveDescription", { count: selectedIds.length })}</p>
        {selectedAlertCount ? <div className={styles.highRiskWarning}><ShieldAlert size={18} /><div><strong>{t("bulkAlertsWarning", { count: selectedAlertCount })}</strong><p>{isSuperadmin ? t("aiOverrideInstructions") : t("bulkAlertsWillBeSkipped")}</p>{isSuperadmin ? <><label className={styles.overrideCheck}><input type="checkbox" checked={bulkAiOverride} onChange={(event) => setBulkAiOverride(event.target.checked)} disabled={bulkApproving} /> {t("aiOverrideConfirm")}</label>{bulkAiOverride ? <input required value={bulkAiOverrideReason} onChange={(event) => setBulkAiOverrideReason(event.target.value)} placeholder={t("aiOverrideReason")} disabled={bulkApproving} /> : null}</> : null}</div></div> : null}
        {isSuperadmin ? <label className={`${styles.duration} ${styles.approvalDuration}`}><span>{t("duration")}</span><select value={bulkDuration} onChange={(event) => setBulkDuration(event.target.value)} disabled={bulkApproving}><option value="7">{t("duration7")}</option><option value="30">{t("duration30")}</option><option value="90">{t("duration90")}</option><option value="365">{t("duration365")}</option></select></label> : null}
      </ConfirmationDialog>
      <ConfirmationDialog open={analyzeOpen} onClose={() => !analyzing && setAnalyzeOpen(false)} title={t("analyzeConfirmTitle")} confirmLabel={analyzing ? t("aiAnalyzing") : t("analyzeCurrentPage")} cancelLabel={t("cancel")} onConfirm={() => void analyzeCurrentPage()}><p>{t("analyzeConfirmDescription", { count: page?.data.length ?? 0 })}</p></ConfirmationDialog>
      <Dialog open={analysisResultsOpen} onClose={() => setAnalysisResultsOpen(false)} title={t("analysisResultsTitle")} className={styles.analysisDialog} footer={<button className={styles.analysisClose} type="button" onClick={() => setAnalysisResultsOpen(false)}>{t("cancel")}</button>}>
        {analysisItems ? <div className={styles.analysisResults}>
          <p className={styles.analysisIntro}>{t("analysisResultsDescription", { count: analysisItems.length })}</p>
          <div className={styles.analysisCounts}><span>{t("analysisClearCount", { count: analysisItems.filter((item) => item.ai_review_summary?.status === "completed" && !hasAiAlerts(item.ai_review_summary)).length })}</span><span>{t("analysisAlertCount", { count: analysisItems.filter((item) => hasAiAlerts(item.ai_review_summary)).length })}</span></div>
          {analysisItems.map((item) => {
            const summary = item.ai_review_summary;
            const flags = alertFlags(summary).slice(0, 3);
            return <article className={styles.analysisItem} key={item.id}><div className={styles.analysisItemHeader}><div><strong>{item.title}</strong><small>{item.listing_number}</small></div><AiBadge summary={summary} t={t} /></div><p>{t("analysisCurrentState")}: <strong>{queueStatusLabel(summary, t)}</strong></p><p>{t("analysisSafetyRisk")}: <strong>{queueRiskLabel(summary, t)}</strong></p>{flags.length ? <ul>{flags.map((flag, index) => <li key={`${findingText(flag)}-${index}`}>{findingText(flag)}</li>)}</ul> : summary?.status?.toLowerCase() === "completed" ? <p className={styles.analysisClear}>{t("analysisNoFlags")}</p> : summary?.status?.toLowerCase() === "failed" || summary?.status?.toLowerCase() === "error" ? <p className={styles.analysisError}>{aiErrorText(summary.error, t) || t("analysisFailed")}</p> : <p className={styles.analysisWaiting}>{t("analysisWaiting")}</p>}</article>;
          })}
        </div> : null}
      </Dialog>
      <Dialog open={Boolean(alertTarget)} onClose={() => setAlertTarget(null)} title={t("alertDetailsTitle", { listing: alertTarget?.title ?? "" })} className={styles.alertDetailsDialog} footer={<button className={styles.analysisClose} type="button" onClick={() => setAlertTarget(null)}>{t("cancel")}</button>}>
        {alertLoading ? <div className={styles.alertDetailsLoading}><LoaderCircle /> {t("alertDetailsLoading")}</div> : alertError ? <p className={styles.aiError}>{errorText(alertError, t("alertDetailsLoadError"))}</p> : alertReview ? <div className={styles.aiAlerts}>
          <strong>{t("aiModerationAlerts")}</strong>
          {alertFlags(alertReview).map((alert, index) => {
            const media = typeof alert === "string" ? undefined : alertMedia?.find((item) => item.id === alert.media_id);
            const severity = typeof alert === "string" ? "alert" : alertSeverity({ flags: [alert] });
            const category = typeof alert === "string" ? null : alert.category ?? alert.detected_label;
            return <article className={`${styles.aiAlert} ${severity === "high" ? styles.aiAlertHigh : severity === "warning" ? styles.aiAlertWarning : ""}`} key={`${findingText(alert)}-${index}`}>{media?.thumbnail_url ?? media?.url ? <img src={media.thumbnail_url ?? media.url ?? ""} alt={media.original_name ?? ""} /> : null}<div><span className={styles.aiAlertSeverity}>{t(`aiSeverity${severity[0].toUpperCase()}${severity.slice(1)}`)}</span><p>{findingText(alert)}</p>{typeof alert !== "string" ? <small>{[category ? t("detectedCategory", { category }) : null, alert.root_type ? t("rootType", { type: alert.root_type }) : null, alert.confidence !== null && alert.confidence !== undefined ? t("confidence", { value: Math.round(Number(alert.confidence) * 100) }) : null, media ? t("aiAlertImage") : null].filter(Boolean).join(" · ")}</small> : null}</div></article>;
          })}
        </div> : null}
      </Dialog>
    </AdminPageGuard>
  );
}

export function AdminModerationReview() {
  const t = useTranslations("adminModeration");
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<AdminModerationDetail | null>(null);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [aiReviewUnavailable, setAiReviewUnavailable] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [decision, setDecision] = useState("approved");
  const [durationDays, setDurationDays] = useState("30");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aiOverride, setAiOverride] = useState(false);
  const [aiOverrideReason, setAiOverrideReason] = useState("");
  const { user } = useAuth();
  const isSuperadmin = user?.roles.includes("superadmin") ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await repository.moderationListing(params.id);
      setListing(result.listing);
      setHistory(result.moderations);
      try {
        setAiReview(await repository.moderationAiReview(params.id));
        setAiReviewUnavailable(false);
      } catch (aiFailure) {
        if (aiFailure instanceof ApiError && [404, 403, 422, 503].includes(aiFailure.status)) {
          setAiReview(null);
          setAiReviewUnavailable(true);
        }
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }

  const loadEvent = useEffectEvent(load);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvent(), 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  useEffect(() => {
    const status = aiReview?.status?.toLowerCase();
    if (!status || !["queued", "running"].includes(status)) return;
    const timer = window.setInterval(() => {
      void repository.moderationAiReview(params.id)
        .then((review) => {
          setAiReview(review);
          setAiReviewUnavailable(false);
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [aiReview?.status, params.id]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (decision === "approved" && (isHighRisk(aiReview ?? listing?.ai_review_summary) || hasAiAlerts(aiReview) || hasAiAlerts(listing?.ai_review_summary)) && (!isSuperadmin || !aiOverride || !aiOverrideReason.trim())) return;
    setConfirmOpen(true);
  }

  async function refreshAiReview(analyze = false) {
    setAiRefreshing(true);
    try {
      if (analyze) await repository.analyzeModeration([Number(params.id)]);
      const review = await repository.moderationAiReview(params.id);
      setAiReview(review);
      setAiReviewUnavailable(false);
    } catch (failure) {
      if (failure instanceof ApiError && [404, 403, 422, 503].includes(failure.status)) setAiReviewUnavailable(true);
      else setError(failure);
    } finally {
      setAiRefreshing(false);
    }
  }

  async function confirmDecision() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      setListing(await repository.decideModeration(params.id, {
        decision,
        reason_code: reason || undefined,
        notes: notes || undefined,
        ...(isSuperadmin && decision === "approved" ? { duration_days: Number(durationDays) } : {}),
        ...(isSuperadmin && decision === "approved" && aiOverride ? { ai_override_reason: aiOverrideReason.trim() } : {}),
      }));
      setNotice(t("saved"));
      await load();
    } catch (failure) {
      if (failure instanceof ApiError) setFieldErrors(failure.errors);
      setError(failure);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  if (loading) return <AdminPageGuard permission={adminPermissions.listingsModerate}><div className={styles.state}>{t("loading")}</div></AdminPageGuard>;
  if (error && !listing) return <AdminPageGuard permission={adminPermissions.listingsModerate}>{error instanceof ApiError && error.status === 403 ? <ForbiddenState /> : <div className={`${styles.state} ${styles.error}`}><p>{errorText(error, t("loadError"))}</p><button type="button" onClick={() => void load()}>{t("retry")}</button></div>}</AdminPageGuard>;
  if (!listing) return null;

  const vehicleConditionValue = (value: unknown): Record<string, string> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return Object.fromEntries(Object.entries(value).flatMap(([part, condition]) => typeof condition === "string" ? [[part, condition]] : [])) as Record<string, string>;
  };
  const attributeValue = (item: NonNullable<AdminModerationDetail["values"]>[number]) => {
    const condition = item.attribute?.code === "vehicle_body_condition" ? vehicleConditionValue(item.json_value) : null;
    if (condition) return <VehicleBodyConditionMap value={condition} readOnly />;
    return displayValue(item.string_value ?? item.text_value ?? item.integer_value ?? item.decimal_value ?? item.boolean_value ?? (item.json_value ? JSON.stringify(item.json_value) : null));
  };
  const translation = (locale: (typeof locales)[number]) => listing.translations.find((item) => item.locale === locale);
  const priceRange = [listing.minimum_price, listing.maximum_price].map(displayValue).join(" - ");
  const hasAlerts = hasAiAlerts(aiReview) || hasAiAlerts(listing.ai_review_summary);
  const highRisk = isHighRisk(aiReview ?? listing.ai_review_summary) || hasAlerts;
  const aiAlerts = alertFlags(aiReview);
  const textFlags = aiReview?.text_flags ?? [];
  const imageReviews = aiReview?.image_findings ?? aiReview?.images ?? [];
  const mediaForReview = (review: AiImageReview) => review.media?.thumbnail_url ?? review.thumbnail_url ?? review.media?.url ?? review.url ?? listing.media?.find((media) => media.id === (review.media_id ?? review.image_id))?.thumbnail_url ?? listing.media?.find((media) => media.id === (review.media_id ?? review.image_id))?.url;

  return (
    <AdminPageGuard permission={adminPermissions.listingsModerate}>
      <section className={styles.page}>
        <Link className={styles.backLink} href="/admin/moderation"><ArrowLeft size={15} /> {t("back")}</Link>
        <header className={styles.hero}><div className={styles.heading}><span className={styles.icon}><ClipboardCheck size={20} /></span><div><small>{t("sectionLabel")}</small><h1>{listing.title}</h1><p>{listing.listing_number} · {listing.moderation_status}</p></div></div><span className={`${styles.statusBadge} ${styles[listing.moderation_status] ?? ""}`}>{listing.moderation_status}</span></header>
        <div className={styles.review}>
          <div className={styles.details}>
            <section className={styles.panel}>
              <h2>{t("listingDetails")}</h2>
              <div className={styles.fields}>
                <div className={styles.field}><strong>{t("seller")}</strong><span>{displayValue(listing.owner?.name)}</span></div>
                <div className={styles.field}><strong>{t("category")}</strong><span>{listing.category_path?.map((item) => item.slug).join(" / ") ?? listing.category?.slug ?? "-"}</span></div>
                <div className={styles.field}><strong>{t("listingLanguage")}</strong><span>{listing.language_code}</span></div>
                <div className={styles.field}><strong>{t("condition")}</strong><span>{displayValue(listing.condition)}</span></div>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{t("submittedTranslations")}</h2>
              <div className={styles.translations}>
                {locales.map((locale) => <article className={styles.translation} key={locale}><h3>{t(`language${locale.toUpperCase()}`)}</h3><div><strong>{t("titleField")}</strong><p>{translation(locale)?.title ?? "-"}</p></div><div><strong>{t("descriptionField")}</strong>{translation(locale)?.description ? <RichText html={translation(locale)!.description} /> : <p>-</p>}</div></article>)}
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{t("pricing")}</h2>
              <div className={styles.fields}>
                <div className={styles.field}><strong>{t("price")}</strong><span>{displayValue(listing.price)}</span></div>
                <div className={styles.field}><strong>{t("priceType")}</strong><span>{displayValue(listing.price_type)}</span></div>
                <div className={styles.field}><strong>{t("currency")}</strong><span>{displayValue(listing.currency?.code)}</span></div>
                <div className={styles.field}><strong>{t("priceRange")}</strong><span>{priceRange}</span></div>
                <div className={styles.field}><strong>{t("salaryPeriod")}</strong><span>{displayValue(listing.salary_period)}</span></div>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{t("listingFlags")}</h2>
              <div className={styles.fields}>
                {([
                  ["isNegotiable", listing.is_negotiable],
                  ["isUrgent", listing.is_urgent],
                  ["isPhoneVisible", listing.is_phone_visible],
                  ["allowMessages", listing.allow_messages],
                ] as const).map(([label, enabled]) => <div className={styles.field} key={label}><strong>{t(label)}</strong><span>{enabled ? t("yes") : t("no")}</span></div>)}
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{t("contact")}</h2>
              <div className={styles.fields}><div className={styles.field}><strong>{t("contactName")}</strong><span>{displayValue(listing.contact_name)}</span></div><div className={styles.field}><strong>{t("contactPhone")}</strong><span>{displayValue(listing.contact_phone)}</span></div><div className={styles.field}><strong>{t("contactEmail")}</strong><span>{displayValue(listing.contact_email)}</span></div></div>
            </section>
            <section className={styles.panel}>
              <h2>{t("location")}</h2>
              <div className={styles.fields}><div className={`${styles.field} ${styles.wide}`}><strong>{t("address")}</strong><span>{displayValue(listing.address)}</span></div><div className={styles.field}><strong>{t("administrativeArea")}</strong><span>{displayValue(listing.administrative_area_id)}</span></div><div className={styles.field}><strong>{t("coordinates")}</strong><span>{listing.latitude === null || listing.longitude === null ? "-" : `${listing.latitude}, ${listing.longitude}`}</span></div></div>
            </section>
            <section className={styles.panel}><h2>{t("attributes")}</h2>{listing.values?.length ? <div className={styles.fields}>{listing.values.map((item) => <div className={`${styles.field} ${item.attribute?.code === "vehicle_body_condition" ? styles.wide : ""}`} key={item.attribute_id}><strong>{item.attribute?.code ?? item.attribute_id}</strong><span>{attributeValue(item)}</span></div>)}</div> : <p>{t("noAttributes")}</p>}</section>
            <section className={styles.panel}><h2>{t("media")}</h2>{listing.media?.length ? <div className={styles.media}>{listing.media.map((item) => <figure key={item.id}><img src={item.url ?? ""} alt={item.original_name ?? ""} /><figcaption>{item.original_name ?? ""}</figcaption></figure>)}</div> : <p>{t("noMedia")}</p>}</section>
          </div>
          <aside className={styles.sidebar}>
            <section className={styles.panel}>
              <div className={styles.aiHeader}><h2>{t("aiReview")}</h2><button type="button" onClick={() => void refreshAiReview(true)} disabled={aiRefreshing || aiReview?.status === "queued" || aiReview?.status === "running"}><RefreshCw size={14} /> {aiRefreshing || aiReview?.status === "queued" || aiReview?.status === "running" ? t("aiAnalyzing") : t("reanalyze")}</button></div>
              {aiReviewUnavailable ? <p className={styles.panelMessage}>{t("aiUnavailableDescription")}</p> : aiReview ? <div className={styles.aiPanelBody}>
                <div className={styles.aiSummary}><AiBadge summary={aiReview} t={t} />{aiReview.analyzed_at ?? aiReview.created_at ? <small>{t("analyzedAt", { date: new Date(aiReview.analyzed_at ?? aiReview.created_at ?? "").toLocaleString() })}</small> : null}</div>
                {aiReview.provider || aiReview.model ? <p className={styles.aiMeta}>{[aiReview.provider, aiReview.model].filter(Boolean).join(" / ")}</p> : null}
                {aiAlerts.length ? <div className={styles.aiAlerts}><strong>{t("aiModerationAlerts")}</strong><p>{t("aiAlertsAdvisory")}</p>{aiAlerts.map((alert, index) => { const media = typeof alert === "string" ? undefined : listing.media?.find((item) => item.id === alert.media_id); const severity = typeof alert === "string" ? "alert" : alertSeverity({ flags: [alert] }); return <article className={`${styles.aiAlert} ${severity === "high" ? styles.aiAlertHigh : severity === "warning" ? styles.aiAlertWarning : ""}`} key={`${findingText(alert)}-${index}`}>{media?.thumbnail_url ?? media?.url ? <img src={media.thumbnail_url ?? media.url ?? ""} alt={media.original_name ?? ""} /> : null}<div><span className={styles.aiAlertSeverity}>{t(`aiSeverity${severity[0].toUpperCase()}${severity.slice(1)}`)}</span><p>{findingText(alert)}</p>{typeof alert !== "string" ? <small>{[alert.code, alert.category ?? alert.root_type, alert.detected_label, alert.confidence !== null && alert.confidence !== undefined ? t("confidence", { value: Math.round(Number(alert.confidence) * 100) }) : null, media ? t("aiAlertImage") : null].filter(Boolean).join(" · ")}</small> : null}</div></article>; })}</div> : null}
                {textFlags.length ? <div className={styles.aiFindings}><strong>{t("textFlags")}</strong>{textFlags.map((flag, index) => <div key={`${findingText(flag)}-${index}`}><span>{findingText(flag)}</span>{typeof flag !== "string" && (flag.confidence ?? flag.score) !== undefined ? <small>{t("confidence", { value: Math.round(Number(flag.confidence ?? flag.score) * 100) })}</small> : null}</div>)}</div> : !aiAlerts.length && aiReview.status === "completed" ? <p className={styles.panelMessage}>{t("noAiFlags")}</p> : null}
                {imageReviews.length ? <div className={styles.aiFindings}><strong>{t("imageFindings")}</strong>{imageReviews.map((image, index) => <article className={`${styles.aiImageFinding} ${styles[`categoryMatch${categoryMatch(image)}`] ?? ""}`} key={`${image.media_id ?? image.image_id ?? "image"}-${index}`}>{mediaForReview(image) ? <img src={mediaForReview(image)} alt="" /> : null}<div className={styles.aiImageDetails}>{image.category_match ? <div className={styles.categoryMatch}><span className={`${styles.categoryMatchBadge} ${styles[`categoryMatchBadge${categoryMatch(image)}`] ?? ""}`}>{t(`categoryMatch${categoryMatch(image)}`)}</span>{image.category_label ? <span>{t("detectedCategory", { category: image.category_label })}</span> : null}{image.category_confidence !== null && image.category_confidence !== undefined ? <small>{t("categoryConfidence", { value: Math.round(Number(image.category_confidence) * 100) })}</small> : null}</div> : null}{(image.findings ?? image.flags ?? []).map((flag, findingIndex) => <p key={`${findingText(flag)}-${findingIndex}`}>{findingText(flag)}{typeof flag !== "string" && (flag.confidence ?? flag.score) !== undefined ? <small>{t("confidence", { value: Math.round(Number(flag.confidence ?? flag.score) * 100) })}</small> : null}</p>)}</div></article>)}</div> : null}
                {aiReview.error || aiReview.errors ? <p className={styles.aiError}>{aiErrorText(aiReview.error ?? aiReview.errors, t)}</p> : null}
              </div> : <p className={styles.panelMessage}>{t("aiNotAnalyzed")}</p>}
            </section>
            <section className={styles.panel}><h2>{t("decision")}</h2>{listing.moderation_status === "pending" ? <form className={styles.actions} onSubmit={submit}><select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="approved">{t("approved")}</option><option value="rejected">{t("rejected")}</option><option value="requires_changes">{t("requiresChanges")}</option><option value="spam">{t("spam")}</option><option value="duplicate">{t("duplicate")}</option></select>{highRisk && decision === "approved" ? <div className={styles.highRiskWarning}><ShieldAlert size={18} /><div><strong>{t("aiHighRiskWarning")}</strong><p>{isSuperadmin ? t("aiOverrideInstructions") : t("aiApprovalBlocked")}</p>{isSuperadmin ? <><label className={styles.overrideCheck}><input type="checkbox" checked={aiOverride} onChange={(event) => setAiOverride(event.target.checked)} /> {t("aiOverrideConfirm")}</label>{aiOverride ? <input required value={aiOverrideReason} onChange={(event) => setAiOverrideReason(event.target.value)} placeholder={t("aiOverrideReason")} /> : null}</> : null}</div></div> : null}{isSuperadmin && decision === "approved" ? <label className={styles.duration}><span>{t("duration")}</span><select value={durationDays} onChange={(event) => setDurationDays(event.target.value)}>{[7, 30, 90, 365].map((days) => <option key={days} value={days}>{t(`duration${days}`)}</option>)}</select></label> : null}<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("reasonPlaceholder")} /><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("notesPlaceholder")} />{fieldErrors.reason_code?.map((message) => <small className={styles.error} key={message}>{message}</small>)}{fieldErrors.ai_override_reason?.map((message) => <small className={styles.error} key={message}>{message}</small>)}{error ? <p className={styles.error}>{errorText(error, t("saveError"))}</p> : null}{notice ? <p className={styles.notice}>{notice}</p> : null}<button type="submit" disabled={saving || (highRisk && decision === "approved" && (!isSuperadmin || !aiOverride || !aiOverrideReason.trim()))}>{saving ? t("saving") : t("saveDecision")}</button></form> : <p className={styles.panelMessage}>{t("alreadyDecided")}</p>}</section>
            <section className={styles.panel}><h2>{t("history")}</h2>{history.length ? <div className={styles.history}>{history.map((item, index) => <article key={String(item.id ?? index)}><strong>{displayValue(item.decision as string | null)}</strong>{item.reason_code ? <span>{String(item.reason_code)}</span> : null}{item.notes ? <span>{String(item.notes)}</span> : null}<small>{displayValue(item.moderator_name as string | null)} · {item.created_at ? new Date(String(item.created_at)).toLocaleString() : "-"}</small></article>)}</div> : <p className={styles.panelMessage}>{t("noHistory")}</p>}</section>
          </aside>
        </div>
      </section>
      <ConfirmationDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t("confirmTitle")} confirmLabel={t("confirmAction")} cancelLabel={t("cancel")} onConfirm={() => void confirmDecision()}>{t("confirmDescription")}</ConfirmationDialog>
    </AdminPageGuard>
  );
}
