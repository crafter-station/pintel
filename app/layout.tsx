import type { Metadata, Viewport } from "next";
import { ClerkThemeProvider } from "@/components/providers/clerk-theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionMergeProvider } from "@/components/providers/session-merge-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { GithubBadge } from "@/components/github-badge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-script";
import { diagonalGridPattern } from "@/lib/grid-patterns";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	: "http://localhost:3000";

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#000000" },
	],
	colorScheme: "light dark",
};

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: "pintel — draw • guess • evaluate",
	description:
		"A multimodal AI evaluation game where humans and models draw, guess, and evaluate each other.",
	openGraph: {
		title: "pintel — draw • guess • evaluate",
		description:
			"A multimodal AI evaluation game where humans and models draw, guess, and evaluate each other.",
		images: ["/pintel_og.png"],
	},
	twitter: {
		card: "summary_large_image",
		title: "pintel — draw • guess • evaluate",
		description:
			"A multimodal AI evaluation game where humans and models draw, guess, and evaluate each other.",
		images: ["/pintel_og.png"],
	},
};

function MainContent({ children }: { children: React.ReactNode }) {
	return (
		<main className="max-w-screen overflow-x-hidden px-2">
			<div className={diagonalGridPattern}>{children}</div>
		</main>
	);
}

function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SiteHeader />
			<MainContent>{children}</MainContent>
			<SiteFooter />
			<GithubBadge />
		</>
	);
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<ThemeScript />
			</head>
			<body className="min-h-screen bg-background font-sans antialiased">
				<ThemeProvider>
					<QueryProvider>
						{clerkPublishableKey ? (
							<ClerkThemeProvider publishableKey={clerkPublishableKey}>
								<SessionMergeProvider>
									<AppShell>{children}</AppShell>
								</SessionMergeProvider>
							</ClerkThemeProvider>
						) : (
							<AppShell>{children}</AppShell>
						)}
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
