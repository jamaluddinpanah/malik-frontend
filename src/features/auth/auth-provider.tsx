"use client";

import type {
  AuthUser,
  ChangePasswordInput,
  FieldErrors,
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/features/auth/entities";
import { ApiError } from "@/shared/lib/api/legacy-api-client";
import { AuthService } from "@/features/auth/auth-service";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  sessionError: string | null;
  isAuthenticating: boolean;
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser>;
  logout(): Promise<void>;
  refreshUser(): Promise<AuthUser | null>;
  updateProfile(input: ProfileUpdateInput): Promise<AuthUser>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  resendVerification(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  can(permission: string): boolean;
  canAny(permissions: string[]): boolean;
  canAll(permissions: string[]): boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const auth = new AuthService();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const currentUser = await auth.currentUser();
      setUser(currentUser);
      setSessionError(null);
      return currentUser;
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        setUser(null);
        setSessionError(null);
        return null;
      }

      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to verify your session.",
      );
      throw error;
    }
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void refreshUser()
        .catch(() => undefined)
        .finally(() => setIsLoading(false));
    }, 0);
    return () => window.clearTimeout(requestId);
  }, [refreshUser]);

  const perform = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setIsAuthenticating(true);
      try {
        return await action();
      } finally {
        setIsAuthenticating(false);
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      sessionError,
      isAuthenticating,
      register: (input) =>
        perform(async () => {
          const registeredUser = await auth.register(input);
          setUser(registeredUser);
          setSessionError(null);
          return registeredUser;
        }),
      login: (input) =>
        perform(async () => {
          // An account switch must start from an anonymous browser session. Without
          // this, a stale superadmin cookie can be mistaken for a new login.
          try {
            await auth.logout();
          } catch {
            // Logout returns 401 when no prior session exists, which is expected.
          }
          setUser(null);
          try {
            const loggedInUser = await auth.login(input);
            const confirmedUser = await auth.currentUser();
            if (confirmedUser.id !== loggedInUser.id) {
              throw new ApiError(
                "The new session did not match the authenticated account.",
                401,
              );
            }
            setUser(confirmedUser);
            setSessionError(null);
            return confirmedUser;
          } catch (error) {
            // A failed account-switch attempt must not leave a prior account
            // (for example, a superadmin session) active in the UI.
            try {
              await auth.logout();
            } catch {
              // Preserve the original login failure for the form to display.
            } finally {
              setUser(null);
            }
            throw error;
          }
        }),
      logout: () =>
        perform(async () => {
          await auth.logout();
          setUser(null);
          setSessionError(null);
        }),
      refreshUser,
      updateProfile: (input) =>
        perform(async () => {
          const updated = await auth.updateProfile(input);
          setUser(updated);
          return updated;
        }),
      changePassword: (input) => perform(() => auth.changePassword(input)),
      resendVerification: () => perform(() => auth.resendVerification()),
      forgotPassword: (email) => perform(() => auth.forgotPassword(email)),
      resetPassword: (input) => perform(() => auth.resetPassword(input)),
      can: (permission) =>
        Boolean(
          user?.roles.includes("superadmin") ||
            user?.permissions.includes(permission),
        ),
      canAny: (permissions) =>
        Boolean(
          user?.roles.includes("superadmin") ||
            permissions.some((permission) =>
              user?.permissions.includes(permission),
            ),
        ),
      canAll: (permissions) =>
        Boolean(
          user?.roles.includes("superadmin") ||
            permissions.every((permission) =>
              user?.permissions.includes(permission),
            ),
        ),
    }),
    [isAuthenticating, isLoading, perform, refreshUser, sessionError, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function authErrors(error: unknown): {
  fields: FieldErrors;
  message: string;
} {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return {
        fields: error.errors,
        message: error.retryAfter
          ? `Too many attempts. Try again in ${error.retryAfter} seconds.`
          : "Too many attempts. Please try again shortly.",
      };
    if (error.status === 401)
      return {
        fields: error.errors,
        message: "Your session has ended. Please sign in again.",
      };
    if (error.status === 403)
      return {
        fields: error.errors,
        message: error.message || "You do not have access to do that.",
      };
    return { fields: error.errors, message: error.message };
  }
  return { fields: {}, message: "Something went wrong. Please try again." };
}
