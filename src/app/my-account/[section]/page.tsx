import { marketplace } from "@/infrastructure/container";
import { AccountDashboard } from "@/presentation/components/account-dashboard";

export default async function MyAccountSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <AccountDashboard title={section.replace(/-/g, " ")} listings={await marketplace.searchListings.execute({})} />;
}
