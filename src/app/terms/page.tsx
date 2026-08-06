import { ManagedContentPlaceholder, managedPageMetadata } from "@/features/content/managed-content-placeholder";
export const generateMetadata = () => managedPageMetadata("terms");
export default function TermsPage() { return <ManagedContentPlaceholder titleKey="terms"/>; }
