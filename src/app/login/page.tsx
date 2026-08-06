import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function LoginPage(){ return <AuthCard/>; }
