"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserIdentity } from "./use-user-identity";

const MERGE_KEY = "pintel_session_merged";

export function useSessionMerge() {
  const { user, isLoaded } = useUser();
  const { anonId, isLoaded: identityLoaded } = useUserIdentity();
  const hasMerged = useRef(false);

  useEffect(() => {
    if (!isLoaded || !identityLoaded || hasMerged.current) return;
    if (!user || !anonId) return;

    const alreadyMerged = localStorage.getItem(MERGE_KEY);
    if (alreadyMerged === user.id) {
      hasMerged.current = true;
      return;
    }

    const mergeSessions = async () => {
      try {
        const res = await fetch("/api/identity/merge", {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(MERGE_KEY, user.id);
          hasMerged.current = true;
          if (data.mergedCount > 0) {
            console.log(`Merged ${data.mergedCount} anonymous sessions`);
          }
        }
      } catch (error) {
        console.error("Failed to merge sessions:", error);
      }
    };

    mergeSessions();
  }, [user, anonId, isLoaded, identityLoaded]);
}
