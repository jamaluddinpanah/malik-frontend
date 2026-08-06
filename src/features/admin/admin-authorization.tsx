"use client";

import { ForbiddenState } from "@/shared/ui/feedback";
import { adminPermissions } from "@/features/auth/permissions";
import { ApiError } from "@/shared/lib/api";
import {
  AdminRepository,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
  type CursorPage,
} from "@/features/admin/admin-repository";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./admin-authorization.module.css";

const repository = new AdminRepository();

function apiMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return Object.values(error.errors).flat()[0] ?? error.message;
}

function AdminState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  const t = useTranslations("adminAuthorization");
  if (loading) return <div className={styles.state}>{t("loading")}</div>;
  if (error instanceof ApiError && error.status === 403)
    return <ForbiddenState />;
  if (error)
    return (
      <div className={styles.state}>
        <p>{apiMessage(error, t("loadFailed"))}</p>
        <button onClick={retry}>{t("retry")}</button>
      </div>
    );
  return null;
}

function Hero({ type }: { type: "users" | "roles" | "permissions" }) {
  const t = useTranslations("adminAuthorization");
  const Icon =
    type === "users" ? Users : type === "roles" ? ShieldCheck : KeyRound;
  return (
    <header className={styles.hero}>
      <div className={styles.heading}>
        <span className={styles.icon}>
          <Icon size={20} />
        </span>
        <div>
          <h1>{t(type)}</h1>
          <p>{t(`${type}Description`)}</p>
        </div>
      </div>
    </header>
  );
}

function Search({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("adminAuthorization");
  return (
    <form
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
      />
      <button type="submit">{t("searchAction")}</button>
    </form>
  );
}

export function AdminUsers() {
  const t = useTranslations("adminAuthorization");
  const roleT = useTranslations("roles");
  const { user: actor, can } = useAuth();
  const mayManageRoles = can(adminPermissions.userRoles);
  const mayUpdateUsers = can(adminPermissions.usersUpdate);
  const maySuspendUsers = can(adminPermissions.usersSuspend);
  const mayRestoreUsers = can(adminPermissions.usersRestore);
  const mayEditUsers = mayUpdateUsers || maySuspendUsers || mayRestoreUsers;
  const mayManageSuperadmin = Boolean(actor?.roles.includes("superadmin"));
  const roleLabel = (role: string) =>
    roleT.has(role) ? roleT(role) : role.replaceAll("_", " ");
  const [page, setPage] = useState<CursorPage<AdminUser> | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AdminRole[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [roleErrors, setRoleErrors] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userErrors, setUserErrors] = useState<Record<string, string[]>>({});
  const [savingUser, setSavingUser] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      repository.users({ cursor, q: appliedQuery }),
      mayManageRoles && can(adminPermissions.roles)
        ? repository.roles({ perPage: 100 })
        : Promise.resolve(null),
    ])
      .then(([users, roles]) => {
        setPage(users.data);
        setTotal(users.meta.total);
        if (roles) setAvailableRoles(roles.data);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  const loadEffect = useEffectEvent(load);

  useEffect(() => {
    const timeout = window.setTimeout(loadEffect, 0);
    return () => window.clearTimeout(timeout);
  }, [appliedQuery, can, cursor, mayManageRoles]);

  const updateRoles = async (
    user: AdminUser,
    role: string | number,
    remove = false,
  ) => {
    setMutationError(null);
    setRoleErrors((current) => {
      const next = { ...current };
      delete next[user.id];
      return next;
    });
    setNotice(null);
    try {
      const roles = remove
        ? await repository.removeUserRole(user.id, role)
        : await repository.assignUserRole(user.id, String(role));
      setPage(
        (current) =>
          current && {
            ...current,
            data: current.data.map((item) =>
              item.id === user.id
                ? {
                    ...item,
                    roles: roles.map(
                      (name) =>
                        availableRoles.find(
                          (candidate) => candidate.name === name,
                        ) ??
                        user.roles.find(
                          (candidate) => candidate.name === name,
                        ) ?? { id: 0, name },
                    ),
                  }
                : item,
            ),
          },
      );
      setNotice(t(remove ? "roleRemoved" : "roleAssigned"));
    } catch (reason) {
      const roleError =
        reason instanceof ApiError ? reason.errors.role?.[0] : undefined;
      if (roleError)
        setRoleErrors((current) => ({ ...current, [user.id]: roleError }));
      setMutationError(
        roleError
          ? null
          : reason instanceof ApiError && reason.status === 403
            ? t("mutationForbidden")
            : apiMessage(reason, t("mutationFailed")),
      );
    }
  };

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser || savingUser) return;
    const form = new FormData(event.currentTarget);
    setSavingUser(true);
    setMutationError(null);
    setUserErrors({});
    setNotice(null);
    try {
      let updated = editingUser;
      const status = String(form.get("status") ?? editingUser.status);
      if (mayUpdateUsers) {
        updated = await repository.updateUser(editingUser.id, {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? "").trim() || null,
          status,
        });
      } else if (status !== editingUser.status) {
        const updatedStatus = await repository.updateUserStatus(
          editingUser.id,
          status,
        );
        updated = { ...updated, status: updatedStatus };
      }
      setPage(
        (current) =>
          current && {
            ...current,
            data: current.data.map((user) =>
              user.id === updated.id ? updated : user,
            ),
          },
      );
      setEditingUser(null);
      setNotice(t("userUpdated"));
    } catch (reason) {
      const fields = reason instanceof ApiError ? reason.errors : {};
      setUserErrors(fields);
      setMutationError(
        Object.keys(fields).length
          ? null
          : reason instanceof ApiError && reason.status === 403
            ? t("mutationForbidden")
            : apiMessage(reason, t("mutationFailed")),
      );
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <AdminPageGuard permission={adminPermissions.users}>
      <div className={styles.page}>
        <Hero type="users" />
        {loading || error ? (
          <AdminState loading={loading} error={error} retry={load} />
        ) : (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>{t("userDirectory")}</h2>
                <p>{t("records", { count: page?.data.length ?? 0 })}</p>
              </div>
              <Search
                value={query}
                onChange={setQuery}
                onSubmit={() => {
                  setCursor(null);
                  setOffset(0);
                  setAppliedQuery(query.trim());
                }}
              />
            </div>
            {mutationError && (
              <p className={styles.error} role="alert">
                {mutationError}
              </p>
            )}
            {notice && (
              <p className={styles.feedback} role="status">
                {notice}
              </p>
            )}
            {editingUser ? (
              <form className={styles.userEditor} onSubmit={saveUser}>
                <h3>{t("editUser")}</h3>
                <label>
                  {t("name")}
                  <input
                    name="name"
                    defaultValue={editingUser.name}
                    disabled={!mayUpdateUsers}
                    aria-invalid={Boolean(userErrors.name)}
                  />
                  {userErrors.name?.[0] ? (
                    <small className={styles.fieldError} role="alert">
                      {userErrors.name[0]}
                    </small>
                  ) : null}
                </label>
                <label>
                  {t("email")}
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingUser.email ?? ""}
                    disabled={!mayUpdateUsers}
                    aria-invalid={Boolean(userErrors.email)}
                  />
                  {userErrors.email?.[0] ? (
                    <small className={styles.fieldError} role="alert">
                      {userErrors.email[0]}
                    </small>
                  ) : null}
                </label>
                <label>
                  {t("status")}
                  <select
                    name="status"
                    defaultValue={editingUser.status}
                    aria-invalid={Boolean(userErrors.status)}
                  >
                    <option value={editingUser.status}>
                      {t(editingUser.status)}
                    </option>
                    {mayRestoreUsers && editingUser.status !== "active" ? (
                      <option value="active">{t("active")}</option>
                    ) : null}
                    {maySuspendUsers
                      ? ["suspended", "blocked", "deactivated"]
                          .filter((status) => status !== editingUser.status)
                          .map((status) => (
                            <option key={status} value={status}>
                              {t(status)}
                            </option>
                          ))
                      : null}
                  </select>
                  {userErrors.status?.[0] ? (
                    <small className={styles.fieldError} role="alert">
                      {userErrors.status[0]}
                    </small>
                  ) : null}
                </label>
                <div className={styles.editorActions}>
                  <button type="button" onClick={() => setEditingUser(null)}>
                    {t("cancel")}
                  </button>
                  <button className={styles.primary} disabled={savingUser}>
                    {savingUser ? t("saving") : t("saveUser")}
                  </button>
                </div>
              </form>
            ) : null}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Count</th>
                    <th>{t("user")}</th>
                    <th>{t("status")}</th>
                    <th>{t("roles")}</th>
                    {mayManageRoles && <th>{t("assignRole")}</th>}
                    {mayEditUsers && <th>{t("actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {page?.data.map((user, index) => (
                    <tr key={user.id}>
                      <td>{offset + index + 1}</td>
                      <td>
                        <strong>{user.name}</strong>
                        <br />
                        <span className={styles.muted}>
                          {user.email ?? t("noEmail")} · {user.account_type}
                        </span>
                      </td>
                      <td>{user.status}</td>
                      <td>
                        <div className={styles.roles}>
                          {user.roles.map((role) => (
                            <span
                              className={styles.role}
                              key={role.id || role.name}
                            >
                              {roleLabel(role.name)}
                              {mayManageRoles &&
                                (role.name !== "superadmin" ||
                                  mayManageSuperadmin) && (
                                  <button
                                    type="button"
                                    aria-label={t("removeRole", {
                                      role: role.name,
                                    })}
                                    onClick={() =>
                                      void updateRoles(
                                        user,
                                        role.id || role.name,
                                        true,
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                )}
                            </span>
                          ))}
                        </div>
                      </td>
                      {mayManageRoles && (
                        <td>
                          <form
                            className={styles.assign}
                            onSubmit={(event) => {
                              event.preventDefault();
                              const data = new FormData(event.currentTarget);
                              const role = String(data.get("role") ?? "");
                              if (role) void updateRoles(user, role);
                            }}
                          >
                            <select
                              name="role"
                              aria-label={t("assignRole")}
                              aria-invalid={Boolean(roleErrors[user.id])}
                              aria-describedby={
                                roleErrors[user.id]
                                  ? `role-error-${user.id}`
                                  : undefined
                              }
                              defaultValue=""
                            >
                              <option value="" disabled>
                                {t("selectRole")}
                              </option>
                              {availableRoles
                                .filter(
                                  (role) =>
                                    (role.name !== "superadmin" ||
                                      mayManageSuperadmin) &&
                                    !user.roles.some(
                                      (assigned) => assigned.name === role.name,
                                    ),
                                )
                                .map((role) => (
                                  <option key={role.id} value={role.name}>
                                    {roleLabel(role.name)}
                                  </option>
                                ))}
                            </select>
                            <button className={styles.primary} type="submit">{t("add")}</button>
                          </form>
                          {roleErrors[user.id] ? (
                            <small
                              id={`role-error-${user.id}`}
                              className={styles.fieldError}
                              role="alert"
                            >
                              {roleErrors[user.id]}
                            </small>
                          ) : null}
                        </td>
                      )}
                      {mayEditUsers && (
                        <td>
                          {mayManageSuperadmin ||
                          !user.roles.some(
                            (role) => role.name === "superadmin",
                          ) ? (
                            <button
                              className={`${styles.primary} ${styles.editUser}`}
                              type="button"
                              onClick={() => {
                                setEditingUser(user);
                                setUserErrors({});
                                setMutationError(null);
                              }}
                            >
                              {t("editUser")}
                            </button>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!page?.data.length && (
              <p className={styles.empty}>{t("noUsers")}</p>
            )}
            <CursorPager page={page} total={total} onCursor={(nextCursor) => { setOffset((value) => nextCursor === page?.next_cursor ? value + (page?.data.length ?? 0) : Math.max(0, value - 10)); setCursor(nextCursor); }} />
          </section>
        )}
      </div>
    </AdminPageGuard>
  );
}

function CursorPager<T>({
  page,
  onCursor,
  total,
}: {
  page: CursorPage<T> | null;
  onCursor: (cursor: string) => void;
  total?: number;
}) {
  const t = useTranslations("adminAuthorization");
  if (!page?.prev_cursor && !page?.next_cursor) return null;
  return (
    <div className={styles.pager}>
      {total !== undefined && <span>{total} items</span>}
      <button
        disabled={!page.prev_cursor}
        onClick={() => page.prev_cursor && onCursor(page.prev_cursor)}
      >
        {t("previous")}
      </button>
      <button
        disabled={!page.next_cursor}
        onClick={() => page.next_cursor && onCursor(page.next_cursor)}
      >
        {t("next")}
      </button>
    </div>
  );
}

export function AdminRoles() {
  const t = useTranslations("adminAuthorization");
  const roleT = useTranslations("roles");
  const { can } = useAuth();
  const roleLabel = (role: string) =>
    roleT.has(role) ? roleT(role) : role.replaceAll("_", " ");
  const mayManagePermissions =
    can(adminPermissions.rolesManage) && can(adminPermissions.permissions);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      repository.roles({ perPage: 100 }),
      mayManagePermissions
        ? repository.permissions({ perPage: 100 })
        : Promise.resolve({ data: [], next_cursor: null, prev_cursor: null }),
    ])
      .then(([rolePage, permissionPage]) => {
        setRoles(rolePage.data);
        setPermissions(permissionPage.data);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  const loadEffect = useEffectEvent(load);
  useEffect(() => {
    const timeout = window.setTimeout(loadEffect, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const choose = (role: AdminRole) => {
    setSelected(role.id);
    setChecked(role.permissions.map((permission) => permission.name));
    setMutationError(null);
    setPermissionError(null);
    setNotice(null);
  };
  const save = async () => {
    if (selected === null) return;
    setSaving(true);
    setMutationError(null);
    setPermissionError(null);
    setNotice(null);
    try {
      const role = await repository.updateRolePermissions(selected, checked);
      setRoles((current) =>
        current.map((item) => (item.id === role.id ? role : item)),
      );
      setChecked(role.permissions.map((permission) => permission.name));
      setNotice(t("permissionsSaved"));
    } catch (reason) {
      const fieldError =
        reason instanceof ApiError
          ? (reason.errors.permissions?.[0] ??
            reason.errors["permissions.0"]?.[0])
          : undefined;
      setPermissionError(fieldError ?? null);
      setMutationError(
        fieldError
          ? null
          : reason instanceof ApiError && reason.status === 403
            ? t("mutationForbidden")
            : apiMessage(reason, t("mutationFailed")),
      );
    } finally {
      setSaving(false);
    }
  };
  const filtered = roles.filter((role) =>
    role.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <AdminPageGuard permission={adminPermissions.roles}>
      <div className={styles.page}>
        <Hero type="roles" />
        {loading || error ? (
          <AdminState loading={loading} error={error} retry={load} />
        ) : (
          <div className={styles.layout}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{t("roleDirectory")}</h2>
                  <p>{t("records", { count: filtered.length })}</p>
                </div>
                <Search
                  value={query}
                  onChange={setQuery}
                  onSubmit={() => undefined}
                />
              </div>
              {!filtered.length ? (
                <p className={styles.empty}>{t("noRoles")}</p>
              ) : null}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("role")}</th>
                      <th>{t("permissions")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <strong>{roleLabel(role.name)}</strong>
                        </td>
                        <td>{role.permissions.length}</td>
                        <td>
                          {mayManagePermissions ? (
                            <button
                              className={styles.primary}
                              onClick={() => choose(role)}
                            >
                              {t("editPermissions")}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {mayManagePermissions ? (
              <aside className={styles.editor}>
                <h2>
                  {selected === null
                    ? t("selectRoleToEdit")
                    : t("editRole", {
                        role: roleLabel(
                          roles.find((role) => role.id === selected)?.name ??
                            "customer",
                        ),
                      })}
                </h2>
                {mutationError && (
                  <p className={styles.error} role="alert">
                    {mutationError}
                  </p>
                )}
                {notice && (
                  <p className={styles.feedback} role="status">
                    {notice}
                  </p>
                )}
                {selected !== null && (
                  <>
                    <div className={styles.checks}>
                      {permissions.map((permission) => (
                        <label className={styles.check} key={permission.id}>
                          <input
                            type="checkbox"
                            checked={checked.includes(permission.name)}
                            aria-invalid={Boolean(permissionError)}
                            aria-describedby={
                              permissionError ? "permissions-error" : undefined
                            }
                            onChange={(event) =>
                              setChecked((current) =>
                                event.target.checked
                                  ? [...current, permission.name]
                                  : current.filter(
                                      (name) => name !== permission.name,
                                    ),
                              )
                            }
                          />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                    {permissionError ? (
                      <small
                        id="permissions-error"
                        className={styles.fieldError}
                        role="alert"
                      >
                        {permissionError}
                      </small>
                    ) : null}
                    <button
                      className={styles.primary}
                      disabled={saving}
                      onClick={() => void save()}
                    >
                      {saving ? t("saving") : t("savePermissions")}
                    </button>
                  </>
                )}
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </AdminPageGuard>
  );
}

export function AdminPermissions() {
  const t = useTranslations("adminAuthorization");
  const [page, setPage] = useState<CursorPage<AdminPermission> | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const load = () => {
    setLoading(true);
    setError(null);
    void repository
      .permissions({ cursor, q: appliedQuery })
      .then(setPage)
      .catch(setError)
      .finally(() => setLoading(false));
  };
  const loadEffect = useEffectEvent(load);
  useEffect(() => {
    const timeout = window.setTimeout(loadEffect, 0);
    return () => window.clearTimeout(timeout);
  }, [appliedQuery, cursor]);
  return (
    <AdminPageGuard permission={adminPermissions.permissions}>
      <div className={styles.page}>
        <Hero type="permissions" />
        {loading || error ? (
          <AdminState loading={loading} error={error} retry={load} />
        ) : (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>{t("permissionCatalogue")}</h2>
                <p>{t("records", { count: page?.data.length ?? 0 })}</p>
              </div>
              <Search
                value={query}
                onChange={setQuery}
                onSubmit={() => {
                  setCursor(null);
                  setAppliedQuery(query.trim());
                }}
              />
            </div>
            <div className={styles.catalogue}>
              {page?.data.map((permission) => (
                <article className={styles.permission} key={permission.id}>
                  <strong>{permission.name}</strong>
                  <small>{permission.guard_name ?? "web"}</small>
                </article>
              ))}
            </div>
            {!page?.data.length && (
              <p className={styles.empty}>{t("noPermissions")}</p>
            )}
            <CursorPager page={page} onCursor={setCursor} />
          </section>
        )}
      </div>
    </AdminPageGuard>
  );
}
