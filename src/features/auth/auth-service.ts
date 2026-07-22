import type { AuthUser, ChangePasswordInput, LoginInput, ProfileUpdateInput, RegisterInput, ResetPasswordInput } from "@/domain/auth/entities";
import { SanctumAuthRepository } from "@/infrastructure/api/sanctum-auth-repository";

/** Typed frontend boundary for Laravel Sanctum authentication operations. */
export class AuthService {
  constructor(private readonly repository = new SanctumAuthRepository()) {}
  register(input: RegisterInput): Promise<AuthUser> { return this.repository.register(input); }
  login(input: LoginInput): Promise<AuthUser> { return this.repository.login(input); }
  logout(): Promise<void> { return this.repository.logout(); }
  currentUser(): Promise<AuthUser> { return this.repository.currentUser(); }
  updateProfile(input: ProfileUpdateInput): Promise<AuthUser> { return this.repository.updateProfile(input); }
  changePassword(input: ChangePasswordInput): Promise<void> { return this.repository.changePassword(input); }
  forgotPassword(email: string): Promise<void> { return this.repository.forgotPassword(email); }
  resetPassword(input: ResetPasswordInput): Promise<void> { return this.repository.resetPassword(input); }
  resendVerification(): Promise<void> { return this.repository.resendVerification(); }
}
