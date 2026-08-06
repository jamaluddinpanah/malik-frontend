import { ManagedContentPlaceholder, managedPageMetadata } from "@/features/content/managed-content-placeholder";
export const generateMetadata = () => managedPageMetadata("safety");
export default function SafetyPage() { return <ManagedContentPlaceholder titleKey="safety"/>; }
