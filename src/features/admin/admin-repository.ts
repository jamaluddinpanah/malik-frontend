import { ApiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import type { LaravelPagination } from "@/shared/types/api";

export type AdminDashboardData = {
  total_users: number;
  total_customers: number;
  total_sellers: number;
  individual_sellers: number;
  business_sellers: number;
  total_listings: number;
  pending_moderation: number;
  published_listings: number;
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

export type CursorPageResponse<T> = { data: CursorPage<T>; meta: { total: number } };

export type AdminModerationItem = {
  id: number;
  listing_number: string;
  title: string;
  status: string;
  moderation_status: string;
  submitted_at: string | null;
  owner?: { id: number; name: string; email: string | null };
  category?: { id: number; slug: string };
  ai_review_summary?: AiReviewSummary | null;
};
export type AiReviewFinding = {
  code?: string | null;
  type?: string | null;
  label?: string | null;
  flag?: string | null;
  severity?: string | null;
  confidence?: number | null;
  score?: number | null;
  description?: string | null;
  message?: string | null;
  media_id?: number | null;
  category?: string | null;
  root_type?: string | null;
  detected_label?: string | null;
};
export type AiReviewSummary = {
  status?: string | null;
  risk?: string | null;
  risk_level?: string | null;
  aggregate_risk?: string | null;
  alert_count?: number | null;
  high_alert_count?: number | null;
  warning_alert_count?: number | null;
  unrelated_image_count?: number | null;
  flags?: AiReviewFinding[] | string[] | null;
  error?: string | null;
};
export type AiImageReview = {
  media_id?: number | null;
  image_id?: number | null;
  category_match?: "related" | "possibly_unrelated" | "unrelated" | "unknown" | null;
  category_label?: string | null;
  category_confidence?: number | null;
  media?: { id?: number; url?: string | null; thumbnail_url?: string | null; original_name?: string | null } | null;
  thumbnail_url?: string | null;
  url?: string | null;
  findings?: AiReviewFinding[] | null;
  flags?: AiReviewFinding[] | string[] | null;
};
export type AiReview = AiReviewSummary & {
  text_flags?: AiReviewFinding[] | string[] | null;
  image_findings?: AiImageReview[] | null;
  images?: AiImageReview[] | null;
  provider?: string | null;
  model?: string | null;
  analyzed_at?: string | null;
  created_at?: string | null;
  errors?: string[] | string | null;
  data?: { flags?: AiReviewFinding[] | string[] | null } | null;
};
export type AdminListing = AdminModerationItem & {
  slug: string;
  category_id: number;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  is_featured: boolean;
  media?: Array<{ id: number; url?: string; thumbnail_url?: string | null; is_cover: boolean; sort_order: number }>;
};
export type AdminModerationDetail = AdminModerationItem & {
  description: string;
  price: string | number | null;
  price_type: string;
  currency: { code: string } | null;
  minimum_price: string | number | null;
  maximum_price: string | number | null;
  salary_period: string | null;
  language_code: "en" | "fa" | "ps";
  condition: string | null;
  is_negotiable: boolean;
  is_urgent: boolean;
  is_phone_visible: boolean;
  allow_messages: boolean;
  address: string | null;
  administrative_area_id: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  translations: Array<{ locale: "en" | "fa" | "ps"; title: string; description: string }>;
  values?: Array<{ attribute_id: number; attribute?: { code: string }; string_value?: string | null; text_value?: string | null; integer_value?: number | null; decimal_value?: string | null; boolean_value?: boolean | null; json_value?: unknown }>;
  media?: Array<{ id: number; url?: string; thumbnail_url?: string | null; original_name?: string; is_cover: boolean; sort_order: number }>;
  category_path?: Array<{ id: number; slug: string }>;
  category?: { id: number; slug: string; translations?: AdminTranslation[] };
};
export type ModerationDecision = { decision: string; reason_code?: string; notes?: string; duration_days?: number; ai_override_reason?: string };
export type BulkModerationApproval = { listing_ids: number[]; duration_days?: number; ai_override_reason?: string };
export type BulkModerationApprovalResult = { approved_listing_ids: number[]; skipped: unknown[] };

export type AdminListQuery = {
  cursor?: string | null;
  q?: string;
  perPage?: number;
  aiRisk?: string;
};
export type AdminListingQuery = AdminListQuery & { status?: string; categoryId?: number | string };

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
  { cursor, q, perPage = 10, status, categoryId, aiRisk }: AdminListQuery & { status?: string; categoryId?: number | string } = {},
): string {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (cursor) params.set("cursor", cursor);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (categoryId) params.set("category_id", String(categoryId));
  if (aiRisk) params.set("ai_risk", aiRisk);
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

  async moderationQueue(query?: AdminListQuery): Promise<CursorPageResponse<AdminModerationItem>> {
    return this.client.request<CursorPageResponse<AdminModerationItem>>(listPath(routes.api.admin.moderationListings, query));
  }

  async adminListings(query?: AdminListingQuery): Promise<CursorPageResponse<AdminListing>> {
    return this.client.request<CursorPageResponse<AdminListing>>(listPath(routes.api.admin.listings, query));
  }

  async adminListing(listing: number | string): Promise<AdminModerationDetail> {
    const response = await this.client.request<{ data: AdminModerationDetail }>(
      routes.api.admin.listing(listing),
    );
    return this.withCurrencyCode(response.data);
  }

  async featureListing(listing: number | string, featured: boolean): Promise<boolean> {
    await this.client.csrfCookie();
    const response = await this.client.request<{ data: { is_featured: boolean } }>(routes.api.admin.listingFeature(listing), { method: "PATCH", body: { featured } });
    return response.data.is_featured;
  }

  async moderationListing(listing: number | string): Promise<{ listing: AdminModerationDetail; moderations: Array<Record<string, unknown>> }> {
    const response = await this.client.request<{ data: AdminModerationDetail; category_path?: Array<{ id: number; slug: string }>; moderations: Array<Record<string, unknown>> }>(routes.api.admin.moderationListing(listing));
    return { listing: { ...this.withCurrencyCode(response.data), category_path: response.category_path }, moderations: response.moderations };
  }

  async analyzeModeration(listingIds: number[]): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.admin.moderationAnalyze, { method: "POST", body: { listing_ids: listingIds } });
  }

  async moderationAiReview(listing: number | string): Promise<AiReview> {
    const response = await this.client.request<{ data: AiReview }>(routes.api.admin.moderationAiReview(listing));
    return response.data;
  }

  async decideModeration(listing: number | string, input: ModerationDecision): Promise<AdminModerationDetail> {
    await this.client.csrfCookie();
    const response = await this.client.request<{ data: AdminModerationDetail }>(routes.api.admin.moderationDecision(listing, input.decision), { method: "POST", body: { reason_code: input.reason_code, notes: input.notes, duration_days: input.duration_days, ai_override_reason: input.ai_override_reason } });
    return this.withCurrencyCode(response.data);
  }

  async bulkApproveModeration(input: BulkModerationApproval): Promise<BulkModerationApprovalResult> {
    await this.client.csrfCookie();
    const response = await this.client.request<{ data: BulkModerationApprovalResult }>(routes.api.admin.moderationBulkApprove, { method: "POST", body: input });
    return response.data;
  }

  private withCurrencyCode(listing: AdminModerationDetail): AdminModerationDetail {
    return listing.price === null || listing.price === undefined || !listing.currency?.code
      ? listing
      : { ...listing, price: `${listing.price} ${listing.currency.code}` };
  }

  async users(query?: AdminListQuery): Promise<CursorPageResponse<AdminUser>> {
    return this.client.request<CursorPageResponse<AdminUser>>(listPath(routes.api.admin.users, query));
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
