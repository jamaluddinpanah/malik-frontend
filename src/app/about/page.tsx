import { ManagedContentPlaceholder, managedPageMetadata } from "@/features/content/managed-content-placeholder";
export const generateMetadata = () => managedPageMetadata("about");
export default function AboutPage() { return <ManagedContentPlaceholder titleKey="about"/>; }
