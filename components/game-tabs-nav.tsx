"use client";

import { Brush, MessageCircle, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const gameModes = [
	{
		id: "human-play",
		title: "Human Play",
		icon: User,
		href: "/play/human-play",
	},
	{
		id: "human-judge",
		title: "Human Judge",
		icon: Brush,
		href: "/play/human-judge",
	},
	{
		id: "model-guess",
		title: "Model Guess",
		icon: MessageCircle,
		href: "/play/model-guess",
	},
	{
		id: "ai-duel",
		title: "AI Duel",
		icon: Sparkles,
		href: "/play/ai-duel",
	},
];

export function GameTabsNav() {
	const pathname = usePathname();

	return (
		<nav
			className={cn(
				"bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-[3px]",
				"grid grid-cols-4",
			)}
		>
			{gameModes.map((mode) => {
				const isActive = pathname === mode.href;
				const Icon = mode.icon;

				return (
					<Link
						key={mode.id}
						href={mode.href}
						className={cn(
							"inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
							"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",
							"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
							isActive
								? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
								: "text-foreground dark:text-muted-foreground hover:text-foreground/80",
						)}
					>
						<Icon className="w-4 h-4" />
						<span className="hidden sm:inline">{mode.title}</span>
					</Link>
				);
			})}
		</nav>
	);
}
