import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/domain/auth/entities";
import type { AuthRepository } from "@/domain/auth/repositories";
import { ApiClient, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";

type UserResponse = { data: { user: AuthUser } };

export class SanctumAuthRepository implements AuthRepository {
  constructor(private readonly client = new ApiClient()) {}

  async register(input: RegisterInput): Promise<AuthUser> {
    await this.client.csrfCookie();
    const response = await this.client.request<UserResponse>(
      routes.api.auth.register,
      {
        method: "POST",
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
          password_confirmation: input.passwordConfirmation,
          account_type: input.accountType,
          phone_country_code: input.phoneCountryCode,
          phone: input.phone,
          profile: input.profile,
        },
      },
    );
    return response.data.user;
  }

  async login(input: LoginInput): Promise<AuthUser> {
    await this.client.csrfCookie();
    const response = await this.client.request<UserResponse>(
      routes.api.auth.login,
      {
        method: "POST",
        body: { ...input, email: undefined },
      },
    );
    if (!response.data?.user?.id)
      throw new ApiError(
        "The sign-in response did not include an authenticated user.",
        401,
      );
    const identity = input.identity.trim().toLocaleLowerCase();
    if (
      identity.includes("@") &&
      response.data.user.email?.toLocaleLowerCase() !== identity
    ) {
      await this.logout();
      throw new ApiError("The provided credentials are incorrect.", 422);
    }
    return response.data.user;
  }

  async logout(): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.auth.logout, { method: "POST" });
  }

  async currentUser(): Promise<AuthUser> {
    const response = await this.client.request<{
      data: { user: AuthUser | null };
    }>(routes.api.auth.session);
    if (!response.data.user) throw new ApiError("Unauthenticated.", 401);
    return response.data.user;
  }

  async updateProfile(input: ProfileUpdateInput): Promise<AuthUser> {
    await this.client.csrfCookie();
    const response = await this.client.request<UserResponse>(
      routes.api.auth.profile,
      {
        method: "PATCH",
        body: {
          name: input.name,
          preferred_locale: input.preferredLocale,
          ...(input.profile ? { profile: input.profile } : {}),
        },
      },
    );
    return response.data.user;
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.auth.changePassword, {
      method: "POST",
      body: {
        current_password: input.currentPassword,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
      },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.auth.forgotPassword, {
      method: "POST",
      body: { email },
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.auth.resetPassword, {
      method: "POST",
      body: {
        email: input.email,
        token: input.token,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
      },
    });
  }

  async resendVerification(): Promise<void> {
    await this.client.csrfCookie();
    await this.client.request(routes.api.auth.resendVerification, {
      method: "POST",
    });
  }
}
