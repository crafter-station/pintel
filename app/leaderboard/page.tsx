"use client";

import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ArrowUpDown,
	TrendingUp,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { AVAILABLE_MODELS, formatCost, getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

type SortField =
	| "overallScore"
	| "humanJudgeWinRate"
	| "modelGuessAccuracy"
	| "aiDuelPoints"
	| "totalCost"
	| "totalTokens";

export default function LeaderboardPage() {
	const { data, isLoading, error } = useLeaderboard();
	const [sortField, setSortField] = useState<SortField>("overallScore");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [providerFilter, setProviderFilter] = useState<string>("all");
	const [tierFilter, setTierFilter] = useState<string>("all");

	const providers = useMemo(() => {
		const uniqueProviders = new Set(AVAILABLE_MODELS.map((m) => m.provider));
		return Array.from(uniqueProviders);
	}, []);

	const sortedModels = useMemo(() => {
		if (!data?.models) return [];

		const filtered = data.models.filter((m) => {
			const model = getModelById(m.modelId);
			if (!model) return false;
			const matchesProvider =
				providerFilter === "all" || model.provider === providerFilter;
			const matchesTier = tierFilter === "all" || model.tier === tierFilter;
			return matchesProvider && matchesTier;
		});

		filtered.sort((a, b) => {
			const aValue = a[sortField];
			const bValue = b[sortField];
			if (sortDirection === "asc") {
				return aValue - bValue;
			}
			return bValue - aValue;
		});

		return filtered;
	}, [data?.models, sortField, sortDirection, providerFilter, tierFilter]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) {
			return <ArrowUpDown className="size-4 ml-1 opacity-50" />;
		}
		return sortDirection === "asc" ? (
			<ArrowUp className="size-4 ml-1" />
		) : (
			<ArrowDown className="size-4 ml-1" />
		);
	};

	return (
		<main className="min-h-screen p-6 md:p-8">
			<div className="max-w-7xl mx-auto space-y-8">
				<header className="flex items-center justify-between">
					<Link href="/">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="size-4" />
							Back
						</Button>
					</Link>
					<div className="text-center">
						<h1 className="text-3xl font-mono font-light">Leaderboard</h1>
						<p className="text-sm text-muted-foreground">
							Model performance rankings
						</p>
					</div>
					<div className="w-20" />
				</header>

				{isLoading && (
					<Card>
						<CardContent className="p-6">
							<div className="space-y-4">
								{[...Array(5)].map((_, i) => (
									<Skeleton key={i} className="h-16 w-full" />
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{error && (
					<Card>
						<CardContent className="p-6 text-center text-muted-foreground">
							Failed to load leaderboard. Please try again.
						</CardContent>
					</Card>
				)}

				{data && (
					<>
						<div className="flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Provider:</span>
								<select
									value={providerFilter}
									onChange={(e) => setProviderFilter(e.target.value)}
									className="px-3 py-1.5 rounded-md border bg-background text-sm"
								>
									<option value="all">All</option>
									{providers.map((p) => (
										<option key={p} value={p}>
											{p}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Tier:</span>
								<select
									value={tierFilter}
									onChange={(e) => setTierFilter(e.target.value)}
									className="px-3 py-1.5 rounded-md border bg-background text-sm"
								>
									<option value="all">All</option>
									<option value="budget">Budget</option>
									<option value="mid">Mid</option>
									<option value="premium">Premium</option>
									<option value="flagship">Flagship</option>
								</select>
							</div>
							<div className="ml-auto text-sm text-muted-foreground">
								{data.totalSessions} total sessions
							</div>
						</div>

						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">Rank</TableHead>
											<TableHead>Model</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("overallScore")}
											>
												<div className="flex items-center">
													Overall Score
													<SortIcon field="overallScore" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("humanJudgeWinRate")}
											>
												<div className="flex items-center">
													Human Judge Win Rate
													<SortIcon field="humanJudgeWinRate" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("modelGuessAccuracy")}
											>
												<div className="flex items-center">
													Model Guess Accuracy
													<SortIcon field="modelGuessAccuracy" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("aiDuelPoints")}
											>
												<div className="flex items-center">
													AI Duel Points
													<SortIcon field="aiDuelPoints" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("totalCost")}
											>
												<div className="flex items-center">
													Total Cost
													<SortIcon field="totalCost" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("totalTokens")}
											>
												<div className="flex items-center">
													Total Tokens
													<SortIcon field="totalTokens" />
												</div>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedModels.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={8}
													className="text-center text-muted-foreground py-8"
												>
													No models found matching filters
												</TableCell>
											</TableRow>
										) : (
											sortedModels.map((model, index) => {
												const modelInfo = getModelById(model.modelId);
												if (!modelInfo) return null;

												const isTopThree =
													index < 3 &&
													sortField === "overallScore" &&
													sortDirection === "desc";

												return (
													<TableRow
														key={model.modelId}
														className={cn(isTopThree && "bg-yellow-500/5")}
													>
														<TableCell>
															<div className="flex items-center gap-2">
																{isTopThree && index === 0 && (
																	<Trophy className="size-4 text-yellow-500" />
																)}
																<span
																	className={cn(
																		"font-mono",
																		isTopThree &&
																			index === 0 &&
																			"font-bold text-yellow-500",
																	)}
																>
																	{index + 1}
																</span>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<div
																	className="size-3 rounded-full"
																	style={{ backgroundColor: modelInfo.color }}
																/>
																<div>
																	<div className="font-medium">
																		{modelInfo.name}
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{modelInfo.provider}
																	</div>
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<span className="font-medium">
																	{model.overallScore.toFixed(1)}
																</span>
																{isTopThree && index === 0 && (
																	<TrendingUp className="size-4 text-yellow-500" />
																)}
															</div>
														</TableCell>
														<TableCell>
															{model.humanJudgePlays > 0 ? (
																<div>
																	<div className="font-medium">
																		{model.humanJudgeWinRate.toFixed(1)}%
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{model.humanJudgeWins}/
																		{model.humanJudgePlays} wins
																	</div>
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</TableCell>
														<TableCell>
															{model.modelGuessTotal > 0 ? (
																<div>
																	<div className="font-medium">
																		{model.modelGuessAccuracy.toFixed(1)}%
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{model.modelGuessCorrect}/
																		{model.modelGuessTotal} correct
																	</div>
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</TableCell>
														<TableCell>
															{model.aiDuelRounds > 0 ? (
																<div>
																	<div className="font-medium">
																		{model.aiDuelPoints}
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{model.aiDuelRounds} rounds
																	</div>
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</TableCell>
														<TableCell>
															<span className="font-medium">
																{formatCost(model.totalCost)}
															</span>
														</TableCell>
														<TableCell>
															<span className="font-mono text-sm">
																{model.totalTokens.toLocaleString()}
															</span>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</main>
	);
}
