"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/shared/lib/api/api-client";
import { routes } from "@/shared/lib/routes";
import { env } from "@/shared/lib/env";
import { ApiError } from "@/shared/lib/api/api-error";
import { useAuth } from "@/features/auth/auth-provider";
import type { LaravelPagination, PaginatedApiResponse } from "@/shared/types/api";
import { Button, ConfirmationDialog, Dialog, FileUploadField, Input, RichText, RichTextEditor, Select } from "@/shared/ui";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import styles from "./job-applications-and-team-management.module.css";

type Member = { id: number; member_user_id: number; membership_type: "business_staff" | "organization_recruiter"; status: string; member?: { name: string; email: string } };
type History = { id: number; from_status?: string | null; to_status: string; created_at?: string; notes?: string | null };
type Application = { id: number; job_listing_id: number; status: string; submitted_at?: string; cover_letter?: string | null; applicant?: { name: string; email: string }; job_listing?: { title: string }; history?: History[] };
type ApplicantProfile = { cover_letter: string | null; resume_name: string | null; has_resume: boolean };
const employerStatuses = ["review", "shortlist", "interview", "offer", "hire", "reject"] as const;

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.status === 403 ? fallback : Object.values(error.errors).flat()[0] ?? error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function FieldErrors({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !Object.keys(error.errors).length) return null;
  const messages = Object.values(error.errors).flat().filter((message) => message !== error.message && message !== "The provided data is invalid.");
  return messages.length ? <div className="field-errors" role="alert">{messages.map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}</div> : null;
}

async function mutate<T = unknown>(path: string, method: "POST" | "PATCH" | "DELETE", body?: BodyInit | Record<string, unknown>) {
  await apiClient.csrfCookie();
  return apiClient.request<T>(path, { method, body });
}

export function JobApplicationForm({ listingId, ownerUserId }: { listingId: number; ownerUserId?: number }) {
  const t = useTranslations("jobs");
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [confirming, setConfirming] = useState(false);
  async function prepareApplication() {
    setMessage(""); setError(null); setSaving(true);
    try {
      const response = await apiClient.request<{ data: ApplicantProfile }>(routes.api.applicationProfile);
      if (!response.data.has_resume || !response.data.cover_letter?.trim()) {
        setMessage(t("completeProfileFirst"));
        return;
      }
      setProfile(response.data);
      setConfirming(true);
    } catch (caught) {
      setError(caught); setMessage(errorMessage(caught, t("operationFailed")));
    } finally { setSaving(false); }
  }
  async function submitApplication() {
    setConfirming(false); setSaving(true); setError(null);
    try {
      await mutate(routes.api.jobApply(listingId), "POST");
      setMessage(t("applicationSent"));
    } catch (caught) {
      setError(caught); setMessage(errorMessage(caught, t("operationFailed")));
    } finally { setSaving(false); }
  }
  if (user?.id === ownerUserId) return null;
  const hasFieldErrors = error instanceof ApiError && Object.keys(error.errors).length > 0;
  return <section className={`${styles.scope} job-apply`}><ConfirmationDialog open={confirming} onClose={() => !saving && setConfirming(false)} title={t("confirmApplication")} cancelLabel={t("cancel")} confirmLabel={saving ? t("loading") : t("submitApplication")} onConfirm={() => void submitApplication()} className={styles.applicationConfirm}><p>{t("confirmApplicationDescription")}</p><p><b>{t("resume")}:</b> {profile?.resume_name}</p><p><b>{t("coverLetter")}:</b></p><RichText html={profile?.cover_letter ?? ""} /></ConfirmationDialog><h2>{t("apply")}</h2><p>{t("applyDescription")}</p><Button type="button" variant="secondary" loading={saving} onClick={() => void prepareApplication()}>{t("submitApplication")}</Button><FieldErrors error={error} />{message && !hasFieldErrors ? <p role={error ? "alert" : "status"}>{message}{message === t("completeProfileFirst") ? <> <Link href="/my-account/application-profile">{t("manageApplicationProfile")}</Link></> : null}</p> : null}</section>;
}

export function ApplicationProfile() {
  const t = useTranslations("jobs");
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { void apiClient.request<{ data: ApplicantProfile }>(routes.api.applicationProfile).then((response) => { setProfile(response.data); setCoverLetter(response.data.cover_letter ?? ""); }).catch((caught) => { setError(caught); setMessage(errorMessage(caught, t("loadError"))); }); }, [t]);
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(""); setError(null); const body = new FormData(); body.set("cover_letter", coverLetter); if (resume) body.set("resume", resume); try { const response = await mutate<{ data: ApplicantProfile }>(routes.api.applicationProfile, "POST", body); setProfile(response.data); setCoverLetter(response.data.cover_letter ?? ""); setResume(null); setMessage(t("profileSaved")); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } finally { setSaving(false); } }
  async function removeResume() { setSaving(true); setError(null); try { const response = await mutate<{ data: ApplicantProfile }>(routes.api.applicationProfileResume, "DELETE"); setProfile(response.data); setMessage(t("resumeRemoved")); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } finally { setSaving(false); } }
  return <section className={`${styles.scope} application-profile`}><header><div><h1>{t("applicationProfile")}</h1><p>{t("applicationProfileDescription")}</p></div></header><form onSubmit={save}><div className="rich-text-field"><b>{t("coverLetter")}</b><RichTextEditor value={coverLetter} onChange={setCoverLetter} /></div><FileUploadField label={resume?.name ?? profile?.resume_name ?? t("resume")} accept=".pdf,.doc,.docx" disabled={saving} onFiles={(files) => setResume(files[0] ?? null)} />{profile?.has_resume ? <div className="profile-resume"><span>{profile.resume_name}</span><a href={`${env.apiUrl}${routes.api.applicationProfileResume}`} target="_blank" rel="noreferrer"><Button type="button" size="sm" variant="ghost">{t("viewResume")}</Button></a><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void removeResume()}>{t("removeResume")}</Button></div> : <p className="profile-missing">{t("resumeRequired")}</p>}<Button type="submit" variant="secondary" loading={saving}>{t("saveApplicationProfile")}</Button></form><FieldErrors error={error} />{message ? <p role={error ? "alert" : "status"}>{message}</p> : null}</section>;
}

export function TeamManagement() {
  const t = useTranslations("jobs"); const [page, setPage] = useState(1); const [members, setMembers] = useState<LaravelPagination<Member> | null>(null); const [error, setError] = useState<unknown>(null); const [message, setMessage] = useState("");
  async function load() { setError(null); try { const response = await apiClient.request<PaginatedApiResponse<Member>>(`${routes.api.myMemberships}?page=${page}`); setMembers(response.data); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("loadError"))); } }
  useEffect(() => { let cancelled = false; void apiClient.request<PaginatedApiResponse<Member>>(`${routes.api.myMemberships}?page=${page}`).then((response) => { if (!cancelled) setMembers(response.data); }).catch((caught: unknown) => { if (!cancelled) { setError(caught); setMessage(errorMessage(caught, t("loadError"))); } }); return () => { cancelled = true; }; }, [page, t]);
  async function invite(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setError(null); try { await mutate(routes.api.memberships, "POST", { member_user_id: Number(form.get("member_user_id")), membership_type: form.get("membership_type") }); event.currentTarget.reset(); await load(); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } }
  async function action(path: string, method: "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>) { setError(null); try { await mutate(path, method, body); await load(); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } }
  return <section className={`${styles.scope} phase-panel`}><header><div><h1>{t("team")}</h1><p>{t("teamDescription")}</p></div></header>{message ? <p role="alert">{message}</p> : null}<FieldErrors error={error} /><form className="phase-form" onSubmit={invite}><Input name="member_user_id" type="number" min="1" placeholder={t("memberUserId")} required /><Select name="membership_type" defaultValue="business_staff"><option value="business_staff">{t("businessStaff")}</option><option value="organization_recruiter">{t("recruiter")}</option></Select><Button type="submit" variant="secondary">{t("invite")}</Button></form><h2>{t("members")}</h2>{!members ? <p role="status">{t("loading")}</p> : <><div className="phase-rows">{members.data.map((member) => <article key={member.id}><span><b>{member.member?.name ?? t("member")}</b><small>{member.member?.email} · {member.status}</small></span><Select aria-label={t("role")} value={member.membership_type} onChange={(event) => void action(routes.api.membershipRole(member.id), "PATCH", { membership_type: event.target.value })}><option value="business_staff">{t("businessStaff")}</option><option value="organization_recruiter">{t("recruiter")}</option></Select>{member.status === "active" ? <Button size="sm" variant="ghost" onClick={() => void action(routes.api.membershipSuspend(member.id), "POST")}>{t("suspend")}</Button> : null}{member.status === "pending" ? <><Button size="sm" variant="ghost" onClick={() => void action(routes.api.membershipResend(member.id), "POST")}>{t("resend")}</Button><Button size="sm" variant="ghost" onClick={() => void action(routes.api.membershipCancel(member.id), "POST")}>{t("cancel")}</Button></> : null}<Button size="sm" variant="danger" onClick={() => void action(routes.api.membership(member.id), "DELETE")}>{t("remove")}</Button></article>)}{!members.data.length ? <p>{t("noMembers")}</p> : null}</div><div className="phase-pagination"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("previous")}</Button><span>{t("page", { page, total: members.last_page })}</span><Button size="sm" variant="ghost" disabled={page >= members.last_page} onClick={() => setPage(page + 1)}>{t("next")}</Button></div></>}</section>;
}

export function Applications({ employer = false }: { employer?: boolean }) {
  const t = useTranslations("jobs"); const [listingId, setListingId] = useState(""); const [page, setPage] = useState(1); const [applications, setApplications] = useState<LaravelPagination<Application> | null>(null); const [status, setStatus] = useState(""); const [error, setError] = useState<unknown>(null); const [message, setMessage] = useState(""); const [history, setHistory] = useState<Record<number, History[]>>({});
  async function load() { if (employer && !listingId) return; setError(null); try { const path = employer ? routes.api.jobListingApplications(listingId) : routes.api.myJobApplications; const response = await apiClient.request<PaginatedApiResponse<Application>>(`${path}?page=${page}`); setApplications(response.data); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("loadError"))); } }
  useEffect(() => { if (employer && !listingId) return; let cancelled = false; const path = employer ? routes.api.jobListingApplications(listingId) : routes.api.myJobApplications; void apiClient.request<PaginatedApiResponse<Application>>(`${path}?page=${page}`).then((response) => { if (!cancelled) setApplications(response.data); }).catch((caught: unknown) => { if (!cancelled) { setError(caught); setMessage(errorMessage(caught, t("loadError"))); } }); return () => { cancelled = true; }; }, [employer, listingId, page, t]);
  async function change(application: Application, next: string) { setError(null); try { await mutate(routes.api.jobApplicationStatus(application.id), "PATCH", { status: next }); await load(); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } }
  async function loadHistory(id: number) { setError(null); try { const response = await apiClient.request<{ data: Application }>(routes.api.jobApplication(id)); setHistory((value) => ({ ...value, [id]: response.data.history ?? [] })); } catch (caught) { setError(caught); setMessage(errorMessage(caught, t("operationFailed"))); } }
  const items = applications?.data.filter((application) => !status || application.status === status) ?? [];
  return <section className={`${styles.scope} phase-panel`}><header><div><h1>{employer ? t("applicantManagement") : t("myApplications")}</h1><p>{employer ? t("applicantDescription") : t("myApplicationsDescription")}</p></div>{employer ? <Select aria-label={t("status")} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("allStatuses")}</option><option value="submitted">{t("submitted")}</option>{employerStatuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select> : null}</header>{employer ? <form className="phase-listing-picker" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}><Input type="number" min="1" value={listingId} onChange={(event) => setListingId(event.target.value)} placeholder={t("listingId")} required /><Button type="submit" variant="secondary">{t("loadApplications")}</Button></form> : null}{message ? <p role="alert">{message}</p> : null}<FieldErrors error={error} />{employer && !listingId ? <p>{t("selectListing")}</p> : !applications ? <p role="status">{t("loading")}</p> : <><div className="phase-rows">{items.map((application) => <article key={application.id}><span><b>{employer ? application.applicant?.name : application.job_listing?.title}</b><small>{employer ? application.applicant?.email : application.submitted_at} · {application.status}</small>{history[application.id]?.map((entry) => <small key={entry.id}>{entry.from_status ? `${entry.from_status} -> ` : ""}{entry.to_status}{entry.notes ? ` · ${entry.notes}` : ""}</small>)}</span>{employer ? <><Button size="sm" variant="ghost" onClick={() => void loadHistory(application.id)}>{t("history")}</Button><a href={`${env.apiUrl}${routes.api.jobApplicationResume(application.id)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t("downloadResume")}</Button></a><Select aria-label={t("status")} value={application.status} onChange={(event) => void change(application, event.target.value)}><option value={application.status}>{t(application.status)}</option>{employerStatuses.filter((value) => value !== application.status).map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select></> : null}</article>)}{!items.length ? <p>{t("noApplications")}</p> : null}</div><div className="phase-pagination"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("previous")}</Button><span>{t("page", { page, total: applications.last_page })}</span><Button size="sm" variant="ghost" disabled={page >= applications.last_page} onClick={() => setPage(page + 1)}>{t("next")}</Button></div></>}</section>;
}

export function ApplicantManagement() {
  const t = useTranslations("jobs");
  const [items, setItems] = useState<Application[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let cancelled = false; void apiClient.request<PaginatedApiResponse<Application>>(routes.api.employerJobApplications).then((response) => { if (!cancelled) setItems(response.data.data); }).catch((caught) => { if (!cancelled) setError(errorMessage(caught, t("loadError"))); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [t]);
  const visible = items.filter((application) => !status || application.status === status);
  return <section className={`${styles.scope} phase-panel`}><header><div><h1>{t("applicantManagement")}</h1><p>{t("applicantDescription")}</p></div><Select aria-label={t("status")} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("allStatuses")}</option><option value="submitted">{t("submitted")}</option>{employerStatuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select></header>{loading ? <p role="status">{t("loading")}</p> : error ? <p role="alert">{error}</p> : !visible.length ? <p>{t("noApplications")}</p> : <div className="phase-rows">{visible.map((application) => <article key={application.id}><span><b>{application.applicant?.name ?? t("member")}</b><small>{application.applicant?.email} · {application.job_listing?.title} · {application.status}</small></span><a href={`${env.apiUrl}${routes.api.jobApplicationResume(application.id)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t("downloadResume")}</Button></a></article>)}</div>}</section>;
}

export function ApplicantManagementDetails() {
  const t = useTranslations("jobs"); const [items,setItems]=useState<Application[]>([]);const [status,setStatus]=useState("");const [selected,setSelected]=useState<Application|null>(null);const [error,setError]=useState("");
  useEffect(()=>{void apiClient.request<PaginatedApiResponse<Application>>(routes.api.employerJobApplications).then((response)=>setItems(response.data.data)).catch((caught)=>setError(errorMessage(caught,t("loadError"))));},[t]);
  useEffect(() => { const download = async (event: MouseEvent) => { const link = (event.target as Element).closest<HTMLAnchorElement>('a[href*="/job-applications/"][href$="/resume"]'); if (!link) return; event.preventDefault(); try { const response = await fetch(link.href, { credentials: "include", headers: { Accept: "application/octet-stream" } }); if (!response.ok) throw new Error(t("operationFailed")); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = link.getAttribute("download") ?? "resume"; anchor.click(); URL.revokeObjectURL(url); } catch (caught) { setError(errorMessage(caught, t("operationFailed"))); } }; document.addEventListener("click", download); return () => document.removeEventListener("click", download); }, [t]);
  async function details(id:number){try{const response=await apiClient.request<{data:Application}>(routes.api.jobApplication(id));setSelected(response.data)}catch(caught){setError(errorMessage(caught,t("loadError")))}}
  async function change(application:Application,next:string){try{const response=await mutate<{data:Application}>(routes.api.jobApplicationStatus(application.id),"PATCH",{status:next});setItems((current)=>current.map((item)=>item.id===application.id?{...item,status:response.data.status}:item));setSelected(response.data)}catch(caught){setError(errorMessage(caught,t("operationFailed")))} }
  const visible=items.filter((item)=>!status||item.status===status);return <section className={`${styles.scope} applicant-management`}><header><div><h1>{t("applicantManagement")}</h1><p>{t("applicantDescription")}</p></div><Select aria-label={t("status")} value={status} onChange={(event)=>setStatus(event.target.value)}><option value="">{t("allStatuses")}</option><option value="submitted">{t("submitted")}</option>{employerStatuses.map((value)=><option key={value} value={value}>{t(value)}</option>)}</Select></header>{error?<p role="alert">{error}</p>:!visible.length?<p>{t("noApplications")}</p>:<div className="phase-rows">{visible.map((application)=><article key={application.id}><span><b>{application.applicant?.name}</b><small>{application.applicant?.email} · {application.job_listing?.title} · {application.status}</small></span><Button size="sm" variant="ghost" onClick={()=>void details(application.id)}>View details</Button><Select aria-label={t("status")} value={application.status} onChange={(event)=>void change(application,event.target.value)}><option value={application.status}>{t(application.status)}</option>{employerStatuses.filter((value)=>value!==application.status).map((value)=><option key={value} value={value}>{t(value)}</option>)}</Select><a href={`${env.apiUrl}${routes.api.jobApplicationResume(application.id)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t("downloadResume")}</Button></a></article>)}</div>}{selected?<Dialog open title="Application details" onClose={()=>setSelected(null)}><div className="application-details"><b>{selected.applicant?.name}</b><small>{selected.applicant?.email} · {selected.job_listing?.title}</small><h3>{t("coverLetter")}</h3>{selected.cover_letter?<RichText html={selected.cover_letter}/>:<p>-</p>}<h3>{t("history")}</h3>{selected.history?.map((entry)=><p key={entry.id}>{entry.from_status?`${entry.from_status} -> `:""}{entry.to_status}{entry.notes?` · ${entry.notes}`:""}</p>)}</div></Dialog>:null}</section>;
}
