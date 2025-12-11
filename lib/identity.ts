import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export interface UserIdentity {
	anonId: string | null;
	clerkUserId: string | null;
	isAuthenticated: boolean;
}

export async function getCurrentIdentity(
	request: NextRequest,
): Promise<UserIdentity> {
	const { userId: clerkUserId } = await auth();
	const anonId = request.cookies.get("anon_id")?.value || null;

	return {
		anonId,
		clerkUserId: clerkUserId || null,
		isAuthenticated: !!clerkUserId,
	};
}
