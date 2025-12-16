"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
	CheckCheckIcon,
	PenToolIcon,
	BotMessageSquareIcon,
	ZapIcon,
	type CheckCheckIconHandle,
} from "@/components/icons";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";

const gameModes = [
	{
		id: "human-play" as const,
		title: "Human Play",
		href: "/play/human-play",
	},
	{
		id: "human-judge" as const,
		title: "Human Judge",
		href: "/play/human-judge",
	},
	{
		id: "model-guess" as const,
		title: "Model Guess",
		href: "/play/model-guess",
	},
	{
		id: "ai-duel" as const,
		title: "AI Duel",
		href: "/play/ai-duel",
	},
];

const modeIcons = {
	"human-play": PenToolIcon,
	"human-judge": CheckCheckIcon,
	"model-guess": BotMessageSquareIcon,
	"ai-duel": ZapIcon,
} as const;

function GameTab({
	mode,
	isActive,
	onClickSound,
}: {
	mode: (typeof gameModes)[number];
	isActive: boolean;
	onClickSound: () => void;
}) {
	const iconRef = useRef<CheckCheckIconHandle>(null);
	const IconComponent = modeIcons[mode.id];

	return (
		<Link
			href={mode.href}
			onClick={onClickSound}
			onMouseEnter={() => iconRef.current?.startAnimation()}
			onMouseLeave={() => iconRef.current?.stopAnimation()}
			className={cn(
				"inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",
				isActive
					? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
					: "text-foreground dark:text-muted-foreground hover:text-foreground/80",
			)}
		>
			<IconComponent ref={iconRef} size={16} className="shrink-0" />
			<span className="hidden sm:inline">{mode.title}</span>
		</Link>
	);
}

export function GameTabsNav() {
	const pathname = usePathname();
	const playClickSound = useSound("/sounds/click.mp3", 0.3);

	return (
		<nav
			className={cn(
				"bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-[3px]",
				"grid grid-cols-4",
			)}
		>
			{gameModes.map((mode) => (
				<GameTab
					key={mode.id}
					mode={mode}
					isActive={pathname === mode.href}
					onClickSound={playClickSound}
				/>
			))}
		</nav>
	);
}
