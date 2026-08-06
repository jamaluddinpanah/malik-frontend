import type { Metadata } from "next";
import { VerifyEmailCard } from "@/features/auth/account-settings-forms";
import { ProtectedRoute } from "@/features/auth/protected-route";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function VerifyEmailPage() { return <ProtectedRoute><VerifyEmailCard/></ProtectedRoute>; }
