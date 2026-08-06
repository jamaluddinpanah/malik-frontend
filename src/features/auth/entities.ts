export type UserRole = string;
export type AccountType =
  | "individual"
  | "business"
  | "organization"
  | "superadmin";

export type AuthUser = {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone_country_code: string | null;
  phone: string | null;
  account_type: AccountType;
  status: "pending" | "active" | "suspended" | "blocked" | "deactivated";
  preferred_locale: "en" | "fa" | "ps";
  role: UserRole | null;
  roles: UserRole[];
  permissions: string[];
  email_verified: boolean;
  phone_verified: boolean;
  last_login_at: string | null;
  profile: Record<string, unknown> | null;
};

export type LoginInput = {
  identity: string;
  password: string;
  remember: boolean;
};

export type RegisterInput = {
  name: string;
  email?: string;
  phoneCountryCode?: string;
  phone?: string;
  password: string;
  passwordConfirmation: string;
  accountType: Exclude<AccountType, "superadmin">;
  profile?: Record<string, string>;
};

export type ProfileUpdateInput = {
  name?: string;
  preferredLocale?: "en" | "fa" | "ps";
  profile?: Record<string, string>;
};

export type ChangePasswordInput = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
};
export type ResetPasswordInput = {
  email: string;
  token: string;
  password: string;
  passwordConfirmation: string;
};

export type { FieldErrors } from "@/shared/types/api";
