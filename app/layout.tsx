import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Button } from "@/components/ui/button";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionMergeProvider } from "@/components/providers/session-merge-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "pintel — draw • guess • evaluate",
  description:
    "A multimodal AI evaluation game where humans and models draw, guess, and evaluate each other.",
};

function AuthHeader() {
  return (
    <header className="fixed top-0 right-0 p-4 z-50">
      <SignedOut>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm">Sign up</Button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9",
            },
          }}
        />
      </SignedIn>
    </header>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHeader />
      <SessionMergeProvider>
        {children}
      </SessionMergeProvider>
    </>
  );
}

function AppWithoutAuth({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          {clerkPublishableKey ? (
            <ClerkProvider
              publishableKey={clerkPublishableKey}
              appearance={{
                baseTheme: dark,
              }}
            >
              <AppContent>{children}</AppContent>
            </ClerkProvider>
          ) : (
            <AppWithoutAuth>{children}</AppWithoutAuth>
          )}
        </QueryProvider>
      </body>
    </html>
  );
}
