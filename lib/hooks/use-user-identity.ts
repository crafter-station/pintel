"use client";

import { useCallback, useEffect, useState } from "react";

const ANON_ID_KEY = "pintel_anon_id";

// Fallback UUID generator for browsers without crypto.randomUUID (older iOS Safari)
function generateUUID(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback using crypto.getRandomValues
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === "x" ? 0 : 3);
			return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
		});
	}
	// Last resort fallback
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
	});
}

export interface UserIdentity {
	anonId: string | null;
	clerkUserId: string | null;
	isAuthenticated: boolean;
}

function _useClerkUserSafe() {
	const [clerkUser, _setClerkUser] = useState<{ id: string } | null>(null);
	const [clerkLoaded, setClerkLoaded] = useState(false);

	useEffect(() => {
		// Try to use Clerk if available
		try {
			const clerkModule = require("@clerk/nextjs");
			if (clerkModule.useUser) {
				// We can't call hooks conditionally, so we'll use a different approach
				// Check if we're in a ClerkProvider context by trying to access it
				setClerkLoaded(true);
			}
		} catch {
			setClerkLoaded(true);
		}
	}, []);

	return { user: clerkUser, isLoaded: clerkLoaded };
}

export function useUserIdentity() {
	const [anonId, setAnonId] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [clerkUserId, setClerkUserId] = useState<string | null>(null);
	const [clerkLoaded, setClerkLoaded] = useState(false);

	const generateAnonId = useCallback(() => {
		return generateUUID();
	}, []);

	const initializeAnonId = useCallback(async () => {
		if (typeof window === "undefined") return;

		let id = localStorage.getItem(ANON_ID_KEY);

		if (!id) {
			id = generateAnonId();
			localStorage.setItem(ANON_ID_KEY, id);

			try {
				await fetch("/api/identity", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ anonId: id }),
				});
			} catch (error) {
				console.error("Failed to sync anonymous ID:", error);
			}
		} else {
			setAnonId(id);
		}

		setAnonId(id);
		setIsInitialized(true);
	}, [generateAnonId]);

	useEffect(() => {
		if (typeof window !== "undefined" && !isInitialized) {
			initializeAnonId();
		}
	}, [isInitialized, initializeAnonId]);

	useEffect(() => {
		// Try to get Clerk user if available, but don't fail if ClerkProvider isn't present
		let mounted = true;

		const checkClerk = async () => {
			try {
				const response = await fetch("/api/identity");
				if (mounted && response.ok) {
					const identity = await response.json();
					setClerkUserId(identity.clerkUserId || null);
					setClerkLoaded(true);
				} else {
					setClerkLoaded(true);
				}
			} catch {
				setClerkLoaded(true);
			}
		};

		checkClerk();

		return () => {
			mounted = false;
		};
	}, []);

	const identity: UserIdentity = {
		anonId: anonId || null,
		clerkUserId: clerkUserId,
		isAuthenticated: !!clerkUserId,
	};

	return {
		...identity,
		isLoaded: clerkLoaded && isInitialized,
	};
}
