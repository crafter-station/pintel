import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GameMode = {
	id: string;
	title: string;
	description: string;
	icon: LucideIcon;
	href: string;
	available: boolean;
};

export function GameModeCard({ mode }: { mode: GameMode }) {
	const Icon = mode.icon;

	return (
		<Link
			href={mode.available ? mode.href : "#"}
			className={cn(!mode.available && "pointer-events-none")}
		>
			<Card
				className={cn(
					"group relative overflow-hidden transition-all duration-300",
					mode.available
						? [
								"cursor-pointer",
								"hover:border-primary/40 hover:bg-card/80 hover:shadow-md",
								"before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border before:to-transparent before:opacity-50",
								"hover:before:via-primary/40",
							].join(" ")
						: "opacity-50",
				)}
			>
				<CardContent className="flex items-start gap-3 py-5">
					<div
						className={cn(
							"p-2.5 rounded-md transition-colors",
							mode.available
								? "bg-primary/10 text-primary group-hover:bg-primary/20"
								: "bg-muted text-muted-foreground",
						)}
					>
						<Icon className="size-5" />
					</div>
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h2 className="text-base font-medium">{mode.title}</h2>
							{!mode.available && (
								<Badge variant="outline" className="text-xs">
									Coming soon
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">{mode.description}</p>
					</div>
					{mode.available && (
						<ArrowRight className="size-5 text-muted-foreground/80 group-hover:text-primary group-hover:translate-x-1 transition-all" />
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
