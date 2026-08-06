import { ManagedContentPlaceholder, managedPageMetadata } from "@/features/content/managed-content-placeholder";
export const generateMetadata = () => managedPageMetadata("privacy");
export default function PrivacyPage() { return <ManagedContentPlaceholder titleKey="privacy"/>; }
