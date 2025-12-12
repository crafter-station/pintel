"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { PintelLogo } from "./pintel";

export function PintelLogoThemeAware({ className }: { className?: string }) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

	return <PintelLogo className={className} mode={mode} />;
}
