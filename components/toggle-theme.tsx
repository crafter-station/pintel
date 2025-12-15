"use client";

import { MoonStarIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "./ui/button";

export function ToggleTheme() {
	const { mounted, isDark, toggleMode } = useTheme();

	const handleClick = (event: React.MouseEvent) => {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const coords = {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		};
		toggleMode(coords);
	};

	if (!mounted) {
		return (
			<Button variant="outline" size="icon" disabled>
				<span className="size-4" />
				<span className="sr-only">Toggle Theme</span>
			</Button>
		);
	}

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={handleClick}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			<SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<MoonStarIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle Theme</span>
		</Button>
	);
}
