import { redirect } from "next/navigation";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  redirect(`/search?category=${encodeURIComponent((await params).slug)}`);
}
