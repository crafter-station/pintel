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
					"group transition-all duration-300",
					mode.available
						? "hover:border-primary/50 hover:bg-card/80 cursor-pointer"
						: "opacity-50",
				)}
			>
				<CardContent className="flex items-start gap-4 py-6">
					<div
						className={cn(
							"p-3 rounded-lg transition-colors",
							mode.available
								? "bg-primary/10 text-primary group-hover:bg-primary/20"
								: "bg-muted text-muted-foreground",
						)}
					>
						<Icon className="size-6" />
					</div>
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-medium">{mode.title}</h2>
							{!mode.available && (
								<Badge variant="outline" className="text-xs">
									Coming soon
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">{mode.description}</p>
					</div>
					{mode.available && (
						<ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
