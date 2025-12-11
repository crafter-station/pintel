"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { GithubLogo } from "./github";

export function GithubLogoThemeAware({
	className,
	variant = "invertocat",
}: {
	className?: string;
	variant?: "invertocat" | "wordmark" | "lockup";
}) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

	return <GithubLogo className={className} variant={variant} mode={mode} />;
}
