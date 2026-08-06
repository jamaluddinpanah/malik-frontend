import { ManagedContentPlaceholder, managedPageMetadata } from "@/features/content/managed-content-placeholder";
export const generateMetadata = () => managedPageMetadata("contact");
export default function ContactPage() { return <ManagedContentPlaceholder titleKey="contact"/>; }
