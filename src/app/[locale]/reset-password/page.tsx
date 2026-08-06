import { PasswordRecoveryCard } from "@/features/auth/password-recovery-card";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <PasswordRecoveryCard reset />; }
