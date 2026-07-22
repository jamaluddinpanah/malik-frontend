import type { ReactNode } from "react";

export function PublicContentContainer({ children }: { children: ReactNode }) {
  return <main className="shell page">{children}</main>;
}
