"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@/hooks/use-theme";

export function ClerkThemeProvider({
	children,
	publishableKey,
}: {
	children: React.ReactNode;
	publishableKey: string;
}) {
	const { isDark } = useTheme();

	return (
		<ClerkProvider
			publishableKey={publishableKey}
			appearance={{
				baseTheme: isDark ? dark : undefined,
			}}
		>
			{children}
		</ClerkProvider>
	);
}
