"use client";

import { useTheme } from "@/hooks/use-theme";
import { GithubLogo } from "./github";

export function GithubLogoThemeAware({
	className,
	variant = "invertocat",
}: {
	className?: string;
	variant?: "invertocat" | "wordmark" | "lockup";
}) {
	const { mounted, isDark } = useTheme();

	const mode = mounted && isDark ? "dark" : "light";

	return <GithubLogo className={className} variant={variant} mode={mode} />;
}
