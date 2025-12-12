"use client";

import { ArrowRight, Bot, Eye, Palette, Trophy, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

export function InlineLeaderboard() {
	const { data, isLoading, error } = useLeaderboard("combined");

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="space-y-3">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null;
	}

	const topEntries = data.entries.slice(0, 5);

	if (topEntries.length === 0) {
		return (
			<Card>
				<CardContent className="p-6 text-center text-muted-foreground">
					No scores yet. Be the first to play!
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="p-0">
				<div className="p-4 border-b flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Trophy className="size-5 text-yellow-500" />
						<h3 className="font-semibold">Top Performers</h3>
					</div>
					<Link href="/leaderboard">
						<Button variant="ghost" size="sm">
							View All
							<ArrowRight className="size-4" />
						</Button>
					</Link>
				</div>
				<div className="divide-y">
					<div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-muted-foreground font-medium">
						<div className="col-span-1">#</div>
						<div className="col-span-5">Competitor</div>
						<div className="col-span-2 text-center flex items-center justify-center gap-1">
							<Palette className="size-3" />
							Draw
						</div>
						<div className="col-span-2 text-center flex items-center justify-center gap-1">
							<Eye className="size-3" />
							Guess
						</div>
						<div className="col-span-2 text-right">Score</div>
					</div>
					{topEntries.map((entry, index) => {
						const modelInfo =
							entry.type === "llm" && entry.modelId
								? getModelById(entry.modelId)
								: null;
						const color = modelInfo?.color || "#10b981";

						return (
							<div
								key={entry.id}
								className={cn(
									"grid grid-cols-12 gap-2 px-4 py-3 items-center",
									index === 0 && "bg-yellow-500/5",
								)}
							>
								<div className="col-span-1">
									<span
										className={cn(
											"font-mono text-sm",
											index === 0 && "text-yellow-500 font-bold",
										)}
									>
										{index + 1}
									</span>
								</div>
								<div className="col-span-5 flex items-center gap-2">
									<div
										className="size-2.5 rounded-full shrink-0"
										style={{ backgroundColor: color }}
									/>
									<span className="text-sm font-medium truncate">
										{entry.name}
									</span>
									{entry.type === "llm" ? (
										<Bot className="size-3 text-muted-foreground shrink-0" />
									) : (
										<User className="size-3 text-muted-foreground shrink-0" />
									)}
								</div>
								<div className="col-span-2 text-center">
									<span className="text-sm font-medium text-blue-600">
										{entry.drawingScore.toFixed(1)}
									</span>
								</div>
								<div className="col-span-2 text-center">
									<span className="text-sm font-medium text-purple-600">
										{entry.guessingScore.toFixed(1)}
									</span>
								</div>
								<div className="col-span-2 text-right">
									<span
										className={cn(
											"text-sm font-bold",
											index === 0 && "text-yellow-500",
										)}
									>
										{entry.overallScore.toFixed(1)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
				{data.totalSessions > 0 && (
					<div className="px-4 py-2 border-t text-xs text-muted-foreground text-center">
						Based on {data.totalSessions} games played
					</div>
				)}
			</CardContent>
		</Card>
	);
}
