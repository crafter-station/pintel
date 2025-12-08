"use client";

import { useSessionMerge } from "@/lib/hooks/use-session-merge";

export function SessionMergeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useSessionMerge();
  return <>{children}</>;
}
