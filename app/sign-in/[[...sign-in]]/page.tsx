import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	// Check if Clerk is configured
	if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<div className="text-center space-y-4">
					<h1 className="text-2xl font-bold">Authentication Not Configured</h1>
					<p className="text-muted-foreground">
						Sign in is not available. Please configure Clerk authentication.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<SignIn
				appearance={{
					elements: {
						rootBox: "mx-auto",
						card: "bg-card border border-border shadow-lg",
					},
				}}
			/>
		</main>
	);
}
