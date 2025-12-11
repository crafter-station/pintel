import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ClerkThemeProvider } from "@/components/providers/clerk-theme-provider";
import { SessionMergeProvider } from "@/components/providers/session-merge-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { diagonalGridPattern } from "@/lib/grid-patterns";
import "./globals.css";

export const metadata: Metadata = {
  title: "pintel — draw • guess • evaluate",
  description:
    "A multimodal AI evaluation game where humans and models draw, guess, and evaluate each other.",
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
