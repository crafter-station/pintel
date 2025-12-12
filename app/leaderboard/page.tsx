"use client";

import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ArrowUpDown,
	Bot,
	Eye,
	Palette,
	Target,
	TrendingUp,
	Trophy,
	User,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type LeaderboardEntry,
	type LeaderboardType,
	useLeaderboard,
} from "@/lib/hooks/use-leaderboard";
import { AVAILABLE_MODELS, formatCost, getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

type SortField =
	| "overallScore"
	| "drawingScore"
	| "guessingScore"
	| "totalCost"
	| "roundsPlayed";

export default function LeaderboardPage() {
	const [leaderboardType, setLeaderboardType] =
		useState<LeaderboardType>("combined");
	const { data, isLoading, error } = useLeaderboard(leaderboardType);
	const [sortField, setSortField] = useState<SortField>("overallScore");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [providerFilter, setProviderFilter] = useState<string>("all");

	const providers = useMemo(() => {
		const uniqueProviders = new Set(AVAILABLE_MODELS.map((m) => m.provider));
		return Array.from(uniqueProviders);
	}, []);

	const sortedEntries = useMemo(() => {
		if (!data?.entries) return [];

		let filtered = data.entries;

		if (leaderboardType === "llm" && providerFilter !== "all") {
			filtered = filtered.filter((entry) => {
				if (entry.type !== "llm" || !entry.modelId) return false;
				const model = getModelById(entry.modelId);
				return model?.provider === providerFilter;
			});
		}

		return [...filtered].sort((a, b) => {
			const aValue = a[sortField] ?? 0;
			const bValue = b[sortField] ?? 0;
			return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
		});
	}, [
		data?.entries,
		sortField,
		sortDirection,
		providerFilter,
		leaderboardType,
	]);

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
							Top performers in AI Pictionary
						</p>
					</div>
					<div className="w-20" />
				</header>

				<Tabs
					value={leaderboardType}
					onValueChange={(v) => setLeaderboardType(v as LeaderboardType)}
				>
					<TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
						<TabsTrigger value="combined" className="gap-2">
							<Trophy className="size-4" />
							All
						</TabsTrigger>
						<TabsTrigger value="llm" className="gap-2">
							<Bot className="size-4" />
							AI Models
						</TabsTrigger>
						<TabsTrigger value="human" className="gap-2">
							<User className="size-4" />
							Players
						</TabsTrigger>
					</TabsList>
				</Tabs>

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
							{leaderboardType === "llm" && (
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										Provider:
									</span>
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
							)}
							<div className="ml-auto text-sm text-muted-foreground">
								{data.totalSessions} total games played
							</div>
						</div>

						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">Rank</TableHead>
											<TableHead>
												{leaderboardType === "human" ? "Player" : "Competitor"}
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("overallScore")}
											>
												<div className="flex items-center">
													<Target className="size-4 mr-1 text-yellow-500" />
													Score
													<SortIcon field="overallScore" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("drawingScore")}
											>
												<div className="flex items-center">
													<Palette className="size-4 mr-1 text-blue-500" />
													Drawing
													<SortIcon field="drawingScore" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("guessingScore")}
											>
												<div className="flex items-center">
													<Eye className="size-4 mr-1 text-purple-500" />
													Guessing
													<SortIcon field="guessingScore" />
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => handleSort("roundsPlayed")}
											>
												<div className="flex items-center">
													Rounds
													<SortIcon field="roundsPlayed" />
												</div>
											</TableHead>
											{leaderboardType !== "human" && (
												<TableHead
													className="cursor-pointer hover:bg-muted/50"
													onClick={() => handleSort("totalCost")}
												>
													<div className="flex items-center">
														Cost
														<SortIcon field="totalCost" />
													</div>
												</TableHead>
											)}
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedEntries.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={7}
													className="text-center text-muted-foreground py-8"
												>
													{leaderboardType === "human"
														? "No players yet. Be the first to play!"
														: "No entries found"}
												</TableCell>
											</TableRow>
										) : (
											sortedEntries.map((entry, index) => (
												<LeaderboardRow
													key={entry.id}
													entry={entry}
													index={index}
													sortField={sortField}
													sortDirection={sortDirection}
													showCost={leaderboardType !== "human"}
												/>
											))
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

function LeaderboardRow({
	entry,
	index,
	sortField,
	sortDirection,
	showCost,
}: {
	entry: LeaderboardEntry;
	index: number;
	sortField: SortField;
	sortDirection: "asc" | "desc";
	showCost: boolean;
}) {
	const isTopThree =
		index < 3 && sortField === "overallScore" && sortDirection === "desc";

	const modelInfo =
		entry.type === "llm" && entry.modelId ? getModelById(entry.modelId) : null;
	const color = modelInfo?.color || "#10b981";

	return (
		<TableRow className={cn(isTopThree && "bg-yellow-500/5")}>
			<TableCell>
				<div className="flex items-center gap-2">
					{isTopThree && index === 0 && (
						<Trophy className="size-4 text-yellow-500" />
					)}
					<span
						className={cn(
							"font-mono",
							isTopThree && index === 0 && "font-bold text-yellow-500",
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
						style={{ backgroundColor: color }}
					/>
					<div>
						<div className="font-medium flex items-center gap-1.5">
							{entry.name}
							{entry.type === "llm" ? (
								<Bot className="size-3 text-muted-foreground" />
							) : (
								<User className="size-3 text-muted-foreground" />
							)}
						</div>
						{entry.type === "llm" && modelInfo && (
							<div className="text-xs text-muted-foreground">
								{modelInfo.provider}
							</div>
						)}
					</div>
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<span className="font-bold text-lg">
						{entry.overallScore.toFixed(1)}
					</span>
					{isTopThree && index === 0 && (
						<TrendingUp className="size-4 text-yellow-500" />
					)}
				</div>
			</TableCell>
			<TableCell>
				{entry.drawingRounds > 0 ? (
					<div>
						<div className="font-medium text-blue-600">
							{entry.drawingScore.toFixed(2)}
						</div>
						<div className="text-xs text-muted-foreground">
							{entry.drawingRounds} rounds
						</div>
					</div>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell>
				{entry.guessingRounds > 0 ? (
					<div>
						<div className="font-medium text-purple-600">
							{entry.guessingScore.toFixed(2)}
						</div>
						<div className="text-xs text-muted-foreground">
							{entry.guessingRounds} rounds
						</div>
					</div>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell>
				<span className="font-mono">{entry.roundsPlayed}</span>
			</TableCell>
			{showCost && (
				<TableCell>
					<span className="font-medium">{formatCost(entry.totalCost)}</span>
				</TableCell>
			)}
		</TableRow>
	);
}
