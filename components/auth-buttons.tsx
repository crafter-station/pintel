"use client";

import {
	SignedIn,
	SignedOut,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/nextjs";

export function AuthButtons() {
	return (
		<>
			<SignedOut>
				<div className="flex items-center gap-2">
					<SignInButton mode="modal">
						<button
							type="button"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Sign in
						</button>
					</SignInButton>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
						>
							Sign up
						</button>
					</SignUpButton>
				</div>
			</SignedOut>
			<SignedIn>
				<UserButton
					appearance={{
						elements: {
							avatarBox: "size-8",
						},
					}}
				/>
			</SignedIn>
		</>
	);
}
