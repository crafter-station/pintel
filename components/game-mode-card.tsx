"use client";

import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";
import {
	CheckCheckIcon,
	PenToolIcon,
	BotMessageSquareIcon,
	ZapIcon,
	type CheckCheckIconHandle,
} from "@/components/icons";

export type GameMode = {
	id: "human-play" | "human-judge" | "model-guess" | "ai-duel";
	title: string;
	tagline: string;
	href: string;
	available: boolean;
	isHero?: boolean;
};

const modeIcons = {
	"human-judge": CheckCheckIcon,
	"human-play": PenToolIcon,
	"model-guess": BotMessageSquareIcon,
	"ai-duel": ZapIcon,
} as const;

export function GameModeCard({ mode }: { mode: GameMode }) {
	const playClickSound = useSound("/sounds/click.mp3", 0.3);
	const iconRef = useRef<CheckCheckIconHandle>(null);
	const IconComponent = modeIcons[mode.id];

	useEffect(() => {
		const timer = setTimeout(() => {
			iconRef.current?.startAnimation();
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	const handleMouseEnter = () => {
		iconRef.current?.startAnimation();
	};

	const handleMouseLeave = () => {
		iconRef.current?.stopAnimation();
	};

	return (
		<Link
			href={mode.available ? mode.href : "#"}
			className={cn(!mode.available && "pointer-events-none")}
			onClick={() => mode.available && playClickSound()}
		>
			<motion.div
				className={cn(
					"relative overflow-hidden rounded-xl border border-border bg-card",
					"transition-colors duration-300",
					mode.available
						? "cursor-pointer hover:border-ring hover:bg-accent"
						: "opacity-40",
					mode.isHero ? "p-6 md:p-8" : "p-4 md:p-5",
				)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				whileHover={{ scale: mode.available ? 1.02 : 1 }}
				whileTap={{ scale: mode.available ? 0.98 : 1 }}
				transition={{ type: "spring", stiffness: 400, damping: 25 }}
			>
				<div
					className={cn(
						"relative z-10",
						mode.isHero ? "space-y-4" : "space-y-3",
					)}
				>
					<div
						className={cn(
							"flex items-center",
							mode.isHero ? "justify-center" : "gap-4",
						)}
					>
						<div
							className={cn(
								"text-muted-foreground",
								mode.isHero ? "w-16 h-16 md:w-20 md:h-20" : "w-10 h-10",
							)}
						>
							<IconComponent
								ref={iconRef}
								size={mode.isHero ? 80 : 40}
								className="w-full h-full"
							/>
						</div>

						{!mode.isHero && (
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<h3 className="font-semibold text-foreground">
										{mode.title}
									</h3>
									{!mode.available && (
										<Badge variant="outline" className="text-[10px] shrink-0">
											Soon
										</Badge>
									)}
								</div>
								<p className="text-sm text-muted-foreground">{mode.tagline}</p>
							</div>
						)}
					</div>

					{mode.isHero && (
						<div className="text-center space-y-2">
							<div className="flex items-center justify-center gap-2">
								<h3 className="text-xl md:text-2xl font-bold text-foreground">
									{mode.title}
								</h3>
								{!mode.available && (
									<Badge variant="outline" className="text-xs">
										Coming soon
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground">{mode.tagline}</p>
						</div>
					)}

					<motion.div
						className={cn(
							"flex items-center justify-center gap-2 text-sm font-medium text-foreground opacity-0",
							mode.isHero ? "pt-2" : "pt-1",
						)}
						whileHover={{ opacity: mode.available ? 1 : 0 }}
					>
						<span>Enter mode</span>
						<span>→</span>
					</motion.div>
				</div>
			</motion.div>
		</Link>
	);
}
