"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";

type BlockedUser = { id: number; name: string; email?: string | null; reason?: string | null };
export function BlockedUsersPanel() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { void apiClient.request<{ data: BlockedUser[] }>(routes.api.blockedUsers).then((response) => setUsers(response.data)).catch(() => setError(true)).finally(() => setLoading(false)); }, 0); return () => window.clearTimeout(timer); }, []);
  async function unblock(id: number) { await apiClient.csrfCookie(); await apiClient.request(routes.api.userBlock(id), { method: "DELETE" }); setUsers((current) => current.filter((user) => user.id !== id)); }
  return <section className="settings-panel"><header><div><h1>Blocked users</h1><p>Manage users you have blocked from messaging you.</p></div></header>{loading ? <p role="status">Loading blocked users...</p> : error ? <p role="alert">Blocked users could not be loaded.</p> : !users.length ? <p>No blocked users.</p> : <div className="status-rows">{users.map((user) => <article className="account-listing-row" key={user.id}><span><b>{user.name}</b>{user.email ? <small>{user.email}</small> : null}</span><button type="button" onClick={() => void unblock(user.id)}>Unblock</button></article>)}</div>}</section>;
}
