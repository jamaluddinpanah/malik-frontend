import { AccountDashboard } from "@/features/account/account-dashboard";
import { notFound } from "next/navigation";

const removedSections = new Set(["account-information", "favorite-searches", "favorite-sellers", "questions-and-answers", "offers", "vehicle-inspection"]);

export default async function MyAccountSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (removedSections.has(section)) notFound();
  return <AccountDashboard title={section.replace(/-/g, " ")} />;
}
