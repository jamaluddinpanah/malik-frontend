import { ApiClient } from "@/lib/api";
import { routes } from "@/lib/routes";
import type { LaravelPagination } from "@/types/api";

export type AdminDashboardData = {
  total_users: number;
  total_customers: number;
  total_sellers: number;
  individual_sellers: number;
  business_sellers: number;
  recent_registrations: Array<{
    id: number;
    name: string;
    email: string | null;
    account_type: string;
    created_at: string;
  }>;
};

export type AdminPermission = {
  id: number;
  name: string;
  guard_name?: string;
  created_at?: string;
};

export type AdminRole = {
  id: number;
  name: string;
  permissions: AdminPermission[];
};

export type AdminUser = {
  id: number;
  name: string;
  email: string | null;
  status: string;
  account_type: string;
  roles: Array<Pick<AdminRole, "id" | "name">>;
};

export type AdminUserUpdate = {
  name: string;
  email: string | null;
  status: string;
};

export type CursorPage<T> = {
  data: T[];
  next_cursor: string | null;
  prev_cursor: string | null;
  next_page_url?: string | null;
  prev_page_url?: string | null;
  per_page?: number;
};

export type AdminListQuery = {
  cursor?: string | null;
  q?: string;
  perPage?: number;
};

export type AdminTranslation = { locale: "en" | "fa" | "ps"; name: string };
export type AdminCategory = {
  id: number;
  parent_id: number | null;
  slug: string;
  icon?: string | null;
  default_expanded?: boolean;
  root_type?: string | null;
  status: boolean;
  is_selectable: boolean;
  allow_listings: boolean;
  translations: AdminTranslation[];
};
export type AdminAttribute = {
  id: number;
  code: string;
  data_type: string;
  input_type: string;
  unit_group?: string | null;
  validation_rules?: Record<string, unknown> | null;
  is_system?: boolean;
  is_active: boolean;
  translations?: AdminTranslation[];
};
export type AdminSection = {
  id: number;
  category_id: number | null;
  code: string;
  sort_order?: number;
  is_active: boolean;
};
export type AdminOption = {
  id: number;
  attribute_id: number;
  parent_option_id: number | null;
  value: string;
  slug: string;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
};
export type AdminSchemaField = {
  attribute_id: number;
  assignment_category_id?: number;
  code: string;
  data_type: string;
  input_type: string;
  section_id: number | null;
  label: string | null;
  required: boolean;
  validation: Record<string, unknown>;
  options: Array<{
    id: number;
    value: string;
    slug: string;
    label: string | null;
  }>;
};
export type AdminSchema = {
  category: { id: number; slug: string };
  sections: Array<{ id: number; code: string; name: string | null }>;
  fields: AdminSchemaField[];
};
export type CategoryAttributeInput = {
  attribute_id: number;
  section_id?: number | null;
  is_required?: boolean;
  sort_order?: number;
  minimum_value?: number | null;
  maximum_value?: number | null;
};

type AdminPage<T> = LaravelPagination<T>;

function listPath(
  path: string,
  { cursor, q, perPage = 20 }: AdminListQuery = {},
): string {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (cursor) params.set("cursor", cursor);
  if (q) params.set("q", q);
  return `${path}?${params}`;
}

export class AdminRepository {
  constructor(private readonly client = new ApiClient()) {}

  async dashboard(): Promise<AdminDashboardData> {
    const response = await this.client.request<{ data: AdminDashboardData }>(
      routes.api.admin.dashboard,
    );
    return response.data;
  }

  async users(query?: AdminListQuery): Promise<CursorPage<AdminUser>> {
    const response = await this.client.request<{
      data: CursorPage<AdminUser>;
    }>(listPath(routes.api.admin.users, query));
    return response.data;
  }

  async updateUser(
    user: number | string,
    input: AdminUserUpdate,
  ): Promise<AdminUser> {
    const response = await this.client.request<{ data: AdminUser }>(
      routes.api.admin.user(user),
      { method: "PATCH", body: input },
    );
    return response.data;
  }

  async updateUserStatus(
    user: number | string,
    status: string,
  ): Promise<string> {
    const response = await this.client.request<{
      data: { user_id: number; status: string };
    }>(routes.api.admin.userStatus(user), {
      method: "PATCH",
      body: { status },
    });
    return response.data.status;
  }

  async roles(query?: AdminListQuery): Promise<CursorPage<AdminRole>> {
    const response = await this.client.request<{
      data: CursorPage<AdminRole>;
    }>(listPath(routes.api.admin.roles, query));
    return response.data;
  }

  async permissions(
    query?: AdminListQuery,
  ): Promise<CursorPage<AdminPermission>> {
    const response = await this.client.request<{
      data: CursorPage<AdminPermission>;
    }>(listPath(routes.api.admin.permissions, query));
    return response.data;
  }

  async updateRolePermissions(
    role: number | string,
    permissions: string[],
  ): Promise<AdminRole> {
    const response = await this.client.request<{ data: AdminRole }>(
      routes.api.admin.rolePermissions(role),
      { method: "PUT", body: { permissions } },
    );
    return response.data;
  }

  async assignUserRole(user: number | string, role: string): Promise<string[]> {
    const response = await this.client.request<{
      data: { user_id: number; roles: string[] };
    }>(routes.api.admin.userRoles(user), {
      method: "POST",
      body: { role },
    });
    return response.data.roles;
  }

  async removeUserRole(
    user: number | string,
    role: number | string,
  ): Promise<string[]> {
    const response = await this.client.request<{
      data: { user_id: number; roles: string[] };
    }>(routes.api.admin.userRole(user, role), { method: "DELETE" });
    return response.data.roles;
  }

  async categories(): Promise<AdminPage<AdminCategory>> {
    const response = await this.client.request<{
      data: AdminPage<AdminCategory>;
    }>(routes.api.admin.categories);
    return response.data;
  }

  async createCategory(input: Record<string, unknown>): Promise<AdminCategory> {
    const response = await this.client.request<{ data: AdminCategory }>(
      routes.api.admin.categories,
      { method: "POST", body: input },
    );
    return response.data;
  }

  async updateCategory(
    category: number | string,
    input: Record<string, unknown>,
  ): Promise<AdminCategory> {
    const response = await this.client.request<{ data: AdminCategory }>(
      routes.api.admin.category(category),
      { method: "PATCH", body: input },
    );
    return response.data;
  }

  async deleteCategory(category: number | string): Promise<void> {
    await this.client.request(routes.api.admin.category(category), {
      method: "DELETE",
    });
  }

  async attributes(): Promise<AdminPage<AdminAttribute>> {
    const response = await this.client.request<{
      data: AdminPage<AdminAttribute>;
    }>(routes.api.admin.attributes);
    return response.data;
  }

  async createAttribute(
    input: Record<string, unknown>,
  ): Promise<AdminAttribute> {
    const response = await this.client.request<{ data: AdminAttribute }>(
      routes.api.admin.attributes,
      { method: "POST", body: input },
    );
    return response.data;
  }

  async updateAttribute(
    attribute: number | string,
    input: Record<string, unknown>,
  ): Promise<AdminAttribute> {
    const response = await this.client.request<{ data: AdminAttribute }>(
      routes.api.admin.attribute(attribute),
      { method: "PATCH", body: input },
    );
    return response.data;
  }

  async deleteAttribute(attribute: number | string): Promise<void> {
    await this.client.request(routes.api.admin.attribute(attribute), {
      method: "DELETE",
    });
  }

  async sections(): Promise<AdminPage<AdminSection>> {
    const response = await this.client.request<{
      data: AdminPage<AdminSection>;
    }>(routes.api.admin.sections);
    return response.data;
  }

  async createSection(input: Record<string, unknown>): Promise<AdminSection> {
    const response = await this.client.request<{ data: AdminSection }>(
      routes.api.admin.sections,
      { method: "POST", body: input },
    );
    return response.data;
  }

  async updateSection(
    section: number | string,
    input: Record<string, unknown>,
  ): Promise<AdminSection> {
    const response = await this.client.request<{ data: AdminSection }>(
      routes.api.admin.section(section),
      { method: "PATCH", body: input },
    );
    return response.data;
  }

  async deleteSection(section: number | string): Promise<void> {
    await this.client.request(routes.api.admin.section(section), {
      method: "DELETE",
    });
  }

  async options(attributeId?: number): Promise<AdminPage<AdminOption>> {
    const path = attributeId
      ? `${routes.api.admin.options}?attribute_id=${attributeId}`
      : routes.api.admin.options;
    const response = await this.client.request<{
      data: AdminPage<AdminOption>;
    }>(path);
    return response.data;
  }

  async createOption(input: Record<string, unknown>): Promise<AdminOption> {
    const response = await this.client.request<{ data: AdminOption }>(
      routes.api.admin.options,
      { method: "POST", body: input },
    );
    return response.data;
  }

  async updateOption(
    option: number | string,
    input: Record<string, unknown>,
  ): Promise<AdminOption> {
    const response = await this.client.request<{ data: AdminOption }>(
      routes.api.admin.option(option),
      { method: "PATCH", body: input },
    );
    return response.data;
  }

  async deleteOption(option: number | string): Promise<void> {
    await this.client.request(routes.api.admin.option(option), {
      method: "DELETE",
    });
  }

  async schemaPreview(
    category: number | string,
    locale?: string,
  ): Promise<AdminSchema> {
    const path = locale
      ? `${routes.api.admin.categorySchema(category)}?locale=${encodeURIComponent(locale)}`
      : routes.api.admin.categorySchema(category);
    const response = await this.client.request<{ data: AdminSchema }>(path, {
      locale,
    });
    return response.data;
  }

  async assignCategoryAttribute(
    category: number | string,
    input: CategoryAttributeInput,
  ): Promise<CategoryAttributeInput> {
    const response = await this.client.request<{
      data: CategoryAttributeInput;
    }>(routes.api.admin.categoryAttributes(category), {
      method: "POST",
      body: input,
    });
    return response.data;
  }

  async removeCategoryAttribute(
    category: number | string,
    attribute: number | string,
  ): Promise<void> {
    await this.client.request(
      `${routes.api.admin.categoryAttributes(category)}/${attribute}`,
      { method: "DELETE" },
    );
  }
}
