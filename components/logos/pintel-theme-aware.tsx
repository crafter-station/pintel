"use client";

import { useTheme } from "@/hooks/use-theme";
import { PintelLogo } from "./pintel";

export function PintelLogoThemeAware({ className }: { className?: string }) {
	const { mounted, isDark } = useTheme();

	const mode = mounted && isDark ? "dark" : "light";

	return <PintelLogo className={className} mode={mode} />;
}
