"use client";

import { ErrorState } from "@/shared/ui/feedback";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell page"><ErrorState onRetry={reset} /></main>;
}
