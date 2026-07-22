import type { AuthUser, LoginInput, RegisterInput } from "@/domain/auth/entities";
import type { AuthRepository } from "@/domain/auth/repositories";

export class AuthUseCases {
  constructor(private readonly repository: AuthRepository) {}

  register(input: RegisterInput): Promise<AuthUser> {
    return this.repository.register(input);
  }

  login(input: LoginInput): Promise<AuthUser> {
    return this.repository.login(input);
  }

  logout(): Promise<void> {
    return this.repository.logout();
  }

  currentUser(): Promise<AuthUser> {
    return this.repository.currentUser();
  }
}
