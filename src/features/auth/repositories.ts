import type { AuthUser, LoginInput, RegisterInput } from "./entities";

export interface AuthRepository {
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser>;
  logout(): Promise<void>;
  currentUser(): Promise<AuthUser>;
}
