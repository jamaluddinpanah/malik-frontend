import { marketplace } from "@/infrastructure/container";
import { AccountDashboard } from "@/presentation/components/account-dashboard";

export default async function MyAccountPage() {
  return <AccountDashboard listings={await marketplace.searchListings.execute({})} />;
}
