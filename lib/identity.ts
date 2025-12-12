import { auth, currentUser } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export interface UserIdentity {
	anonId: string | null;
	clerkUserId: string | null;
	isAuthenticated: boolean;
	username: string | null;
}

export async function getCurrentIdentity(
	request: NextRequest,
): Promise<UserIdentity> {
	const { userId: clerkUserId } = await auth();
	const anonId = request.cookies.get("anon_id")?.value || null;

	let username: string | null = null;
	if (clerkUserId) {
		const user = await currentUser();
		if (user) {
			username =
				user.username ||
				[user.firstName, user.lastName].filter(Boolean).join(" ") ||
				null;
		}
	}

	return {
		anonId,
		clerkUserId: clerkUserId || null,
		isAuthenticated: !!clerkUserId,
		username,
	};
}
