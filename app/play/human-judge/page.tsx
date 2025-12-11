"use client";

import {
	ArrowLeft,
	Check,
	Clock,
	Coins,
	DollarSign,
	Play,
	RotateCcw,
	Settings2,
	Shuffle,
	Sparkles,
	Trophy,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignupPrompt } from "@/components/signup-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSaveSession } from "@/lib/hooks/use-gallery";
import { useUserIdentity } from "@/lib/hooks/use-user-identity";
import {
	AVAILABLE_MODELS,
	DEFAULT_MODELS,
	formatCost,
	getModelById,
	getUniqueProviders,
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import type { Drawing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GameState {
	status: "setup" | "idle" | "generating" | "voting" | "results";
	prompt: string;
	drawings: Drawing[];
	selectedDrawing: string | null;
	leaderboard: Record<string, number>;
	roundsPlayed: number;
	totalTimeMs: number;
	roundCost: number;
	totalCost: number;
	totalTokens: number;
	selectedModels: string[];
}

interface GeneratingModel {
	id: string;
	name: string;
	color: string;
	status: "pending" | "streaming" | "done" | "error";
	svg?: string;
	timeMs?: number;
}

type FilterType = "all" | "budget" | "mid" | "premium" | "flagship";

export default function HumanJudgePage() {
	const saveSession = useSaveSession();
	const { isAuthenticated } = useUserIdentity();
	const [showSignupPrompt, setShowSignupPrompt] = useState(false);
	const [hasShownPrompt, setHasShownPrompt] = useState(false);
	const [gameState, setGameState] = useState<GameState>({
		status: "setup",
		prompt: "",
		drawings: [],
		selectedDrawing: null,
		leaderboard: {},
		roundsPlayed: 0,
		totalTimeMs: 0,
		roundCost: 0,
		totalCost: 0,
		totalTokens: 0,
		selectedModels: DEFAULT_MODELS,
	});

	const [generatingModels, setGeneratingModels] = useState<GeneratingModel[]>(
		[],
	);
	const [providerFilter, setProviderFilter] = useState<string>("all");
	const [tierFilter, setTierFilter] = useState<FilterType>("all");
	const [elapsedTime, setElapsedTime] = useState(0);
	const startTimeRef = useRef<number | null>(null);

	// Timer for elapsed time during generation
	useEffect(() => {
		if (gameState.status === "generating") {
			startTimeRef.current = Date.now();
			const interval = setInterval(() => {
				if (startTimeRef.current) {
					setElapsedTime(
						Math.floor((Date.now() - startTimeRef.current) / 1000),
					);
				}
			}, 1000);
			return () => clearInterval(interval);
		} else {
			setElapsedTime(0);
			startTimeRef.current = null;
		}
	}, [gameState.status]);

	const providers = useMemo(() => getUniqueProviders(), []);

	const filteredModels = useMemo(() => {
		return AVAILABLE_MODELS.filter((m) => {
			const matchesProvider =
				providerFilter === "all" || m.provider === providerFilter;
			const matchesTier = tierFilter === "all" || m.tier === tierFilter;
			return matchesProvider && matchesTier;
		});
	}, [providerFilter, tierFilter]);

	const toggleModel = useCallback((modelId: string) => {
		setGameState((prev) => ({
			...prev,
			selectedModels: prev.selectedModels.includes(modelId)
				? prev.selectedModels.filter((id) => id !== modelId)
				: prev.selectedModels.length < 8
					? [...prev.selectedModels, modelId]
					: prev.selectedModels, // Max 8 models
		}));
	}, []);

	const removeModel = useCallback((modelId: string) => {
		setGameState((prev) => ({
			...prev,
			selectedModels: prev.selectedModels.filter((id) => id !== modelId),
		}));
	}, []);

	const shuffleSelection = useCallback((count: number) => {
		const shuffled = shuffleModels(AVAILABLE_MODELS, count);
		setGameState((prev) => ({
			...prev,
			selectedModels: shuffled.map((m) => m.id),
		}));
	}, []);

	const startRound = useCallback(async () => {
		const prompt = getRandomPrompt();

		setGameState((prev) => ({
			...prev,
			status: "generating",
			prompt,
			drawings: [],
			selectedDrawing: null,
			roundCost: 0,
		}));

		// Initialize generating models state
		setGeneratingModels(
			gameState.selectedModels.map((modelId) => {
				const model = getModelById(modelId);
				return {
					id: modelId,
					name: model?.name || modelId,
					color: model?.color || "#888",
					status: "pending",
				};
			}),
		);

		try {
			const response = await fetch("/api/generate-drawings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt, models: gameState.selectedModels }),
			});

			if (!response.ok) {
				throw new Error("Failed to generate drawings");
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";
			const completedDrawings: Drawing[] = [];
			const chunksMap = new Map<string, string[]>(); // Track chunks per model for replay
			let totalCost = 0;
			let totalTokens = 0;
			let totalTimeMs = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const jsonStr = line.slice(6);

					try {
						const event = JSON.parse(jsonStr);

						if (event.type === "start") {
							// Mark all models as pending (waiting to stream)
							setGeneratingModels((prev) =>
								prev.map((m) => ({ ...m, status: "pending" })),
							);
						} else if (event.type === "partial") {
							// Collect chunks for replay
							if (!chunksMap.has(event.modelId)) {
								chunksMap.set(event.modelId, []);
							}
							chunksMap.get(event.modelId)?.push(event.svg);

							// Update partial SVG as it streams in
							setGeneratingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? { ...m, status: "streaming", svg: event.svg }
										: m,
								),
							);
						} else if (event.type === "drawing") {
							// Update the specific model as done with its drawing
							setGeneratingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? {
												...m,
												status: "done",
												svg: event.svg,
												timeMs: event.generationTimeMs,
											}
										: m,
								),
							);
							completedDrawings.push({
								modelId: event.modelId,
								svg: event.svg,
								generationTimeMs: event.generationTimeMs,
								usage: event.usage,
								cost: event.cost,
								chunks: chunksMap.get(event.modelId) || [],
							});
						} else if (event.type === "error") {
							// Mark as error
							setGeneratingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? { ...m, status: "error", timeMs: event.generationTimeMs }
										: m,
								),
							);
						} else if (event.type === "complete") {
							totalCost = event.totalCost;
							totalTokens = event.totalTokens;
							totalTimeMs = event.totalTimeMs;
						}
					} catch (e) {
						console.error("Failed to parse SSE event:", e);
					}
				}
			}

			// Shuffle drawings to anonymize them
			const shuffledDrawings = [...completedDrawings].sort(
				() => Math.random() - 0.5,
			);

			setGameState((prev) => ({
				...prev,
				status: "voting",
				drawings: shuffledDrawings,
				totalTimeMs,
				roundCost: totalCost,
				totalCost: prev.totalCost + totalCost,
				totalTokens: prev.totalTokens + totalTokens,
			}));
		} catch (error) {
			console.error("Error:", error);
			setGameState((prev) => ({
				...prev,
				status: "idle",
			}));
		}
	}, [gameState.selectedModels]);

	const startGame = useCallback(async () => {
		if (gameState.selectedModels.length < 2) return;
		setGameState((prev) => ({
			...prev,
			leaderboard: {},
			roundsPlayed: 0,
			totalCost: 0,
			totalTokens: 0,
		}));
		// Go directly to generating
		await startRound();
	}, [gameState.selectedModels.length, startRound]);

	const selectDrawing = useCallback((modelId: string) => {
		setGameState((prev) => ({
			...prev,
			selectedDrawing: modelId,
		}));
	}, []);

	const confirmVote = useCallback(() => {
		if (!gameState.selectedDrawing) return;

		// Save to gallery (outside of state updater to avoid duplicate calls)
		saveSession.mutate({
			mode: "human_judge",
			prompt: gameState.prompt,
			totalCost: gameState.roundCost,
			totalTokens: gameState.totalTokens,
			totalTimeMs: gameState.totalTimeMs,
			drawings: gameState.drawings.map((d) => ({
				modelId: d.modelId,
				svg: d.svg,
				generationTimeMs: d.generationTimeMs,
				cost: d.cost,
				tokens: d.usage?.totalTokens,
				isWinner: d.modelId === gameState.selectedDrawing,
				chunks: d.chunks,
			})),
		});

		setGameState((prev) => {
			const newState = {
				...prev,
				status: "results" as const,
				leaderboard: {
					...prev.leaderboard,
					[prev.selectedDrawing!]:
						(prev.leaderboard[prev.selectedDrawing!] || 0) + 1,
				},
				roundsPlayed: prev.roundsPlayed + 1,
			};

			if (!isAuthenticated && !hasShownPrompt) {
				setTimeout(() => {
					setShowSignupPrompt(true);
					setHasShownPrompt(true);
				}, 1000);
			}

			return newState;
		});
	}, [
		gameState.selectedDrawing,
		gameState.prompt,
		gameState.drawings,
		gameState.roundCost,
		gameState.totalTokens,
		gameState.totalTimeMs,
		saveSession,
		isAuthenticated,
		hasShownPrompt,
	]);

	const playAgain = useCallback(() => {
		startRound();
	}, [startRound]);

	return (
		<TooltipProvider>
			<main className="min-h-screen p-6 md:p-8">
				<div className="max-w-6xl mx-auto space-y-8">
					{/* Header */}
					<header className="flex items-center justify-between">
						<Link href="/">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="size-4" />
								Back
							</Button>
						</Link>
						<div className="text-center">
							<h1 className="text-2xl font-mono font-light">Human Judge</h1>
							<p className="text-sm text-muted-foreground">
								Pick the best drawing
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="outline" className="cursor-help">
										<DollarSign className="size-3" />
										{formatCost(gameState.totalCost)}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Total session cost</p>
									<p className="text-xs text-muted-foreground">
										{gameState.totalTokens.toLocaleString()} tokens used
									</p>
								</TooltipContent>
							</Tooltip>
							<Badge variant="outline">
								<Trophy className="size-3" />
								Round {gameState.roundsPlayed + 1}
							</Badge>
						</div>
					</header>

					{/* Setup - Model Selection */}
					{gameState.status === "setup" && (
						<div className="flex flex-col md:flex-row gap-6">
							{/* Left: Model Grid */}
							<Card className="flex-1 min-w-0 overflow-hidden">
								<div className="p-4 border-b flex flex-wrap items-center gap-3">
									<ToggleGroup
										type="single"
										value={providerFilter}
										onValueChange={(v) => v && setProviderFilter(v)}
										size="sm"
									>
										<ToggleGroupItem value="all">All</ToggleGroupItem>
										{providers.slice(0, 6).map((provider) => (
											<ToggleGroupItem key={provider} value={provider}>
												{provider}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
									<div className="h-4 w-px bg-border" />
									<ToggleGroup
										type="single"
										value={tierFilter}
										onValueChange={(v) => v && setTierFilter(v as FilterType)}
										size="sm"
									>
										<ToggleGroupItem value="all">All</ToggleGroupItem>
										<ToggleGroupItem value="budget">$</ToggleGroupItem>
										<ToggleGroupItem value="mid">$$</ToggleGroupItem>
										<ToggleGroupItem value="premium">$$$</ToggleGroupItem>
										<ToggleGroupItem value="flagship">$$$$</ToggleGroupItem>
									</ToggleGroup>
								</div>
								<CardContent className="p-3">
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
										{filteredModels.map((model) => {
											const isSelected = gameState.selectedModels.includes(
												model.id,
											);
											const isDisabled =
												!isSelected && gameState.selectedModels.length >= 8;
											return (
												<button
													key={model.id}
													onClick={() => !isDisabled && toggleModel(model.id)}
													disabled={isDisabled}
													className={cn(
														"group relative p-3 rounded-md text-left transition-all",
														isSelected
															? "bg-primary text-primary-foreground"
															: isDisabled
																? "opacity-30 cursor-not-allowed"
																: "hover:bg-muted",
													)}
												>
													<div className="flex items-center gap-2">
														<span
															className={cn(
																"size-2 rounded-full shrink-0",
																isSelected && "ring-2 ring-primary-foreground",
															)}
															style={{ backgroundColor: model.color }}
														/>
														<span className="text-sm font-medium truncate">
															{model.name}
														</span>
													</div>
													<div
														className={cn(
															"text-xs mt-1",
															isSelected
																? "text-primary-foreground/70"
																: "text-muted-foreground",
														)}
													>
														${model.pricing.input} / ${model.pricing.output}
													</div>
													{isSelected && (
														<div className="absolute top-1 right-1">
															<Check className="size-3" />
														</div>
													)}
												</button>
											);
										})}
									</div>
								</CardContent>
							</Card>

							{/* Right: Your Squad */}
							<div className="w-full md:w-72 shrink-0">
								<Card className="md:sticky md:top-24">
									<CardContent className="p-4 space-y-4">
										<div className="flex items-center justify-between">
											<h3 className="font-medium">Your Squad</h3>
											<span className="text-xs text-muted-foreground tabular-nums">
												{gameState.selectedModels.length}/8
											</span>
										</div>

										<div className="space-y-2 min-h-[200px]">
											{gameState.selectedModels.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-8">
													Select models from the grid
												</p>
											) : (
												gameState.selectedModels.map((modelId, index) => {
													const model = getModelById(modelId);
													if (!model) return null;
													return (
														<div
															key={modelId}
															className="flex items-center gap-3 p-2 rounded-md bg-muted/50 group"
														>
															<span className="text-xs text-muted-foreground w-4">
																{index + 1}
															</span>
															<span
																className="size-2.5 rounded-full shrink-0"
																style={{ backgroundColor: model.color }}
															/>
															<span className="text-sm flex-1 truncate">
																{model.name}
															</span>
															<button
																onClick={() => removeModel(modelId)}
																className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
															>
																<X className="size-3.5 text-muted-foreground hover:text-foreground" />
															</button>
														</div>
													);
												})
											)}
										</div>

										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => shuffleSelection(4)}
											>
												<Shuffle className="size-3" />
												Random
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() =>
													setGameState((prev) => ({
														...prev,
														selectedModels: [],
													}))
												}
												disabled={gameState.selectedModels.length === 0}
											>
												Clear
											</Button>
										</div>

										<Button
											className="w-full"
											onClick={startGame}
											disabled={gameState.selectedModels.length < 2}
										>
											<Play className="size-4" />
											{gameState.selectedModels.length < 2
												? "Select 2+ models"
												: "Start Battle"}
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					)}

					{/* Game Area */}
					{gameState.status === "idle" && (
						<div className="flex flex-col items-center justify-center py-20 space-y-8">
							<div className="text-center space-y-4">
								<Sparkles className="size-16 mx-auto text-primary" />
								<h2 className="text-3xl font-light">Ready to play?</h2>
								<p className="text-muted-foreground max-w-md">
									{gameState.selectedModels.length} AI models will draw a
									concept. Your job is to pick the one that best captures the
									idea.
								</p>
							</div>
							<div className="flex gap-4">
								<Button
									variant="outline"
									onClick={() =>
										setGameState((prev) => ({ ...prev, status: "setup" }))
									}
								>
									<Settings2 className="size-4" />
									Change Models
								</Button>
								<Button size="lg" onClick={startRound}>
									<Play className="size-4" />
									Start Round
								</Button>
							</div>
						</div>
					)}

					{gameState.status === "generating" && (
						<div className="space-y-8">
							<div className="text-center space-y-4">
								<Badge variant="secondary" className="text-lg px-6 py-2">
									&ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<div className="flex items-center justify-center gap-4">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Clock className="size-4" />
										<span className="tabular-nums font-mono">
											{elapsedTime}s
										</span>
									</div>
									<div className="h-4 w-px bg-border" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<div className="flex gap-1">
											{generatingModels.map((m) => (
												<div
													key={m.id}
													className={cn(
														"size-2 rounded-full transition-all duration-300",
														m.status === "pending" && "opacity-30",
														m.status === "streaming" &&
															"animate-pulse ring-1 ring-blue-500",
														m.status === "done" && "ring-1 ring-green-500",
														m.status === "error" && "ring-1 ring-red-500",
													)}
													style={{ backgroundColor: m.color }}
												/>
											))}
										</div>
										<span>
											{generatingModels.filter((m) => m.status === "streaming")
												.length > 0 && (
												<span className="text-blue-500">
													{
														generatingModels.filter(
															(m) => m.status === "streaming",
														).length
													}{" "}
													drawing
												</span>
											)}
											{generatingModels.filter((m) => m.status === "streaming")
												.length > 0 &&
												generatingModels.filter((m) => m.status === "done")
													.length > 0 &&
												" · "}
											{generatingModels.filter((m) => m.status === "done")
												.length > 0 && (
												<span className="text-green-500">
													{
														generatingModels.filter((m) => m.status === "done")
															.length
													}{" "}
													done
												</span>
											)}
											{generatingModels.filter((m) => m.status === "streaming")
												.length === 0 &&
												generatingModels.filter((m) => m.status === "done")
													.length === 0 && <span>Connecting...</span>}
										</span>
									</div>
								</div>
							</div>

							<div
								className={cn(
									"grid gap-4",
									generatingModels.length <= 4
										? "grid-cols-2 md:grid-cols-4"
										: generatingModels.length <= 6
											? "grid-cols-2 md:grid-cols-3"
											: "grid-cols-2 md:grid-cols-4",
								)}
							>
								{generatingModels.map((model) => (
									<Card
										key={model.id}
										className={cn(
											"overflow-hidden transition-all duration-300",
											model.status === "streaming" && "ring-2 ring-blue-500/30",
											model.status === "done" && "ring-2 ring-green-500/30",
											model.status === "error" &&
												"ring-2 ring-red-500/30 opacity-60",
										)}
									>
										<CardContent className="p-0">
											<div className="aspect-square bg-white relative flex items-center justify-center overflow-hidden">
												{model.status === "pending" && (
													<div className="text-center space-y-3 text-muted-foreground">
														<Spinner className="size-6 mx-auto opacity-50" />
														<span className="text-xs">Connecting...</span>
													</div>
												)}
												{(model.status === "streaming" ||
													model.status === "done") &&
													model.svg && (
														<div
															className="w-full h-full"
															dangerouslySetInnerHTML={{ __html: model.svg }}
														/>
													)}
												{model.status === "error" && (
													<div className="text-center space-y-2 text-red-500">
														<X className="size-8 mx-auto" />
														<span className="text-xs">Failed</span>
													</div>
												)}
												{(model.status === "streaming" ||
													model.status === "done") && (
													<div className="absolute top-2 inset-x-2 flex items-center justify-between">
														<Badge
															variant="secondary"
															className={cn(
																"text-xs",
																model.status === "streaming" && "animate-pulse",
															)}
														>
															{model.status === "streaming" && (
																<Spinner className="size-3 mr-1" />
															)}
															{model.svg
																? `${(model.svg.length / 1000).toFixed(1)}kb`
																: "0kb"}
														</Badge>
														<Badge
															variant="outline"
															className="text-xs bg-background/80 backdrop-blur-sm tabular-nums"
														>
															{model.status === "done" && model.timeMs
																? `${(model.timeMs / 1000).toFixed(1)}s`
																: `${elapsedTime}s`}
														</Badge>
													</div>
												)}
											</div>
											<div className="p-3 border-t bg-card">
												<div className="flex items-center gap-2">
													<div
														className={cn(
															"size-2.5 rounded-full transition-all",
															model.status === "streaming" && "animate-pulse",
														)}
														style={{ backgroundColor: model.color }}
													/>
													<span className="text-sm font-medium truncate text-muted-foreground">
														???
													</span>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}

					{gameState.status === "voting" && (
						<div className="space-y-8">
							<div className="text-center space-y-4">
								<Badge
									variant="secondary"
									className="text-lg px-6 py-2 animate-in fade-in duration-500"
								>
									&ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<h2 className="text-xl font-light text-muted-foreground">
									Pick your favorite
								</h2>
								<div className="flex items-center justify-center gap-6 text-sm">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Clock className="size-4" />
										<span className="tabular-nums">
											{(gameState.totalTimeMs / 1000).toFixed(1)}s
										</span>
									</div>
									<div className="h-4 w-px bg-border" />
									<div className="flex items-center gap-2 text-muted-foreground">
										<Coins className="size-4" />
										<span className="tabular-nums">
											{formatCost(gameState.roundCost)}
										</span>
									</div>
								</div>
							</div>

							<div
								className={cn(
									"grid gap-6",
									generatingModels.length <= 4
										? "grid-cols-2 md:grid-cols-4"
										: generatingModels.length <= 6
											? "grid-cols-2 md:grid-cols-3"
											: "grid-cols-2 md:grid-cols-4",
								)}
							>
								{generatingModels.map((model, index) => {
									const drawing = gameState.drawings.find(
										(d) => d.modelId === model.id,
									);
									const isError = model.status === "error";
									const isSelected = gameState.selectedDrawing === model.id;

									if (isError) {
										return (
											<Card
												key={model.id}
												className="overflow-hidden opacity-50 ring-2 ring-red-500/30"
											>
												<CardContent className="p-0">
													<div className="aspect-square bg-muted flex items-center justify-center">
														<div className="text-center space-y-2 text-red-500">
															<X className="size-8 mx-auto" />
															<span className="text-xs">Failed</span>
														</div>
													</div>
													<div className="p-4 border-t bg-card">
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-muted-foreground">
																{String.fromCharCode(65 + index)}
															</span>
															<Badge
																variant="outline"
																className="text-xs text-red-500"
															>
																Error
															</Badge>
														</div>
													</div>
												</CardContent>
											</Card>
										);
									}

									if (!drawing) return null;

									return (
										<Card
											key={model.id}
											className={cn(
												"group overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
												isSelected
													? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]"
													: "hover:ring-2 hover:ring-primary/30",
											)}
											onClick={() => selectDrawing(model.id)}
										>
											<CardContent className="p-0">
												<div className="aspect-square bg-white relative overflow-hidden">
													<div
														className="w-full h-full transition-transform duration-300 group-hover:scale-105"
														dangerouslySetInnerHTML={{ __html: drawing.svg }}
													/>
													<div
														className={cn(
															"absolute inset-0 bg-primary/10 transition-opacity duration-300",
															isSelected ? "opacity-100" : "opacity-0",
														)}
													/>
													{isSelected && (
														<div className="absolute top-3 right-3 size-8 rounded-full bg-primary flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
															<Check className="size-5 text-primary-foreground" />
														</div>
													)}
													<div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
												</div>
												<div className="p-4 border-t bg-card">
													<div className="flex items-center justify-between">
														<span
															className={cn(
																"text-sm font-medium transition-colors",
																isSelected
																	? "text-primary"
																	: "text-muted-foreground",
															)}
														>
															{String.fromCharCode(65 + index)}
														</span>
														<Badge
															variant="outline"
															className="text-xs tabular-nums"
														>
															{(drawing.generationTimeMs / 1000).toFixed(1)}s
														</Badge>
													</div>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>

							<div className="flex justify-center pt-4">
								<Button
									size="lg"
									disabled={!gameState.selectedDrawing}
									onClick={confirmVote}
									className="px-8 transition-all duration-300"
								>
									<Check className="size-4" />
									Confirm Selection
								</Button>
							</div>
						</div>
					)}

					{gameState.status === "results" && (
						<div className="space-y-8">
							<div className="text-center space-y-4">
								<Badge
									variant="secondary"
									className="text-lg px-6 py-2 animate-in fade-in duration-500"
								>
									&ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<h2 className="text-2xl font-light">And the winner is...</h2>
								<div className="flex items-center justify-center gap-6 text-sm">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Coins className="size-4" />
										<span>
											Round:{" "}
											<span className="tabular-nums">
												{formatCost(gameState.roundCost)}
											</span>
										</span>
									</div>
									<div className="h-4 w-px bg-border" />
									<div className="flex items-center gap-2 text-muted-foreground">
										<DollarSign className="size-4" />
										<span>
											Session:{" "}
											<span className="tabular-nums">
												{formatCost(gameState.totalCost)}
											</span>
										</span>
									</div>
								</div>
							</div>

							<div
								className={cn(
									"grid gap-6",
									generatingModels.length <= 4
										? "grid-cols-2 md:grid-cols-4"
										: generatingModels.length <= 6
											? "grid-cols-2 md:grid-cols-3"
											: "grid-cols-2 md:grid-cols-4",
								)}
							>
								{generatingModels.map((genModel) => {
									const drawing = gameState.drawings.find(
										(d) => d.modelId === genModel.id,
									);
									const model = getModelById(genModel.id);
									const isError = genModel.status === "error";
									const isWinner = gameState.selectedDrawing === genModel.id;

									if (isError) {
										return (
											<Card
												key={genModel.id}
												className="overflow-hidden opacity-50 ring-2 ring-red-500/30"
											>
												<CardContent className="p-0">
													<div className="aspect-square bg-muted flex items-center justify-center">
														<div className="text-center space-y-2 text-red-500">
															<X className="size-8 mx-auto" />
															<span className="text-xs">Failed</span>
														</div>
													</div>
													<div className="p-4 border-t space-y-2">
														<div className="flex items-center gap-2">
															<div
																className="size-3 rounded-full ring-2 ring-background"
																style={{ backgroundColor: model?.color }}
															/>
															<span className="text-sm font-medium text-muted-foreground">
																{model?.name}
															</span>
														</div>
														<div className="text-xs text-red-500">
															Generation failed
														</div>
													</div>
												</CardContent>
											</Card>
										);
									}

									if (!drawing) return null;

									return (
										<Card
											key={genModel.id}
											className={cn(
												"overflow-hidden transition-all duration-500",
												isWinner
													? "ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/20 scale-[1.02]"
													: "opacity-75 hover:opacity-100",
											)}
										>
											<CardContent className="p-0">
												<div className="aspect-square bg-white relative">
													<div
														className="w-full h-full"
														dangerouslySetInnerHTML={{ __html: drawing.svg }}
													/>
													{isWinner && (
														<div className="absolute top-3 right-3 animate-in zoom-in duration-300">
															<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 shadow-lg">
																<Trophy className="size-3" />
																Winner
															</Badge>
														</div>
													)}
												</div>
												<div
													className={cn(
														"p-4 border-t space-y-2 transition-colors",
														isWinner && "bg-yellow-500/5",
													)}
												>
													<div className="flex items-center gap-2">
														<div
															className="size-3 rounded-full ring-2 ring-background"
															style={{ backgroundColor: model?.color }}
														/>
														<span
															className={cn(
																"text-sm font-medium",
																isWinner &&
																	"text-yellow-600 dark:text-yellow-400",
															)}
														>
															{model?.name}
														</span>
													</div>
													<div className="flex items-center justify-between text-xs text-muted-foreground">
														<span className="tabular-nums">
															{(drawing.generationTimeMs / 1000).toFixed(1)}s
														</span>
														<Tooltip>
															<TooltipTrigger className="cursor-help tabular-nums">
																{formatCost(drawing.cost || 0)}
															</TooltipTrigger>
															<TooltipContent>
																<p>
																	{drawing.usage?.totalTokens?.toLocaleString() ||
																		0}{" "}
																	tokens
																</p>
																<p className="text-xs text-muted-foreground">
																	In:{" "}
																	{drawing.usage?.promptTokens?.toLocaleString() ||
																		0}{" "}
																	/ Out:{" "}
																	{drawing.usage?.completionTokens?.toLocaleString() ||
																		0}
																</p>
															</TooltipContent>
														</Tooltip>
													</div>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>

							{/* Leaderboard */}
							<Card className="overflow-hidden">
								<div className="p-6 border-b bg-muted/30">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<Trophy className="size-5 text-yellow-500" />
											<h3 className="text-lg font-medium">Leaderboard</h3>
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="tabular-nums">
												{gameState.roundsPlayed} rounds
											</span>
											<div className="h-4 w-px bg-border" />
											<span className="tabular-nums">
												{gameState.totalTokens.toLocaleString()} tokens
											</span>
										</div>
									</div>
								</div>
								<CardContent className="p-6">
									<div className="space-y-4">
										{[...gameState.selectedModels]
											.sort(
												(a, b) =>
													(gameState.leaderboard[b] || 0) -
													(gameState.leaderboard[a] || 0),
											)
											.map((modelId, index) => {
												const model = getModelById(modelId);
												if (!model) return null;
												const wins = gameState.leaderboard[model.id] || 0;
												const percentage =
													gameState.roundsPlayed > 0
														? (wins / gameState.roundsPlayed) * 100
														: 0;
												const isLeader = index === 0 && wins > 0;

												return (
													<div key={model.id} className="space-y-2">
														<div className="flex items-center justify-between text-sm">
															<div className="flex items-center gap-3">
																<span
																	className={cn(
																		"w-6 text-center font-mono text-xs",
																		isLeader
																			? "text-yellow-500 font-bold"
																			: "text-muted-foreground",
																	)}
																>
																	{index + 1}
																</span>
																<div
																	className="size-3 rounded-full"
																	style={{ backgroundColor: model.color }}
																/>
																<span
																	className={cn(
																		"font-medium",
																		isLeader &&
																			"text-yellow-600 dark:text-yellow-400",
																	)}
																>
																	{model.name}
																</span>
																{isLeader && (
																	<Trophy className="size-4 text-yellow-500" />
																)}
															</div>
															<span className="text-muted-foreground tabular-nums">
																{wins} win{wins !== 1 ? "s" : ""} (
																{percentage.toFixed(0)}%)
															</span>
														</div>
														<Progress
															value={percentage}
															className={cn(
																"h-2",
																isLeader && "[&>div]:bg-yellow-500",
															)}
														/>
													</div>
												);
											})}
									</div>
								</CardContent>
							</Card>

							<div className="flex justify-center gap-4 pt-4">
								<Button
									variant="outline"
									onClick={() =>
										setGameState((prev) => ({ ...prev, status: "setup" }))
									}
								>
									<Settings2 className="size-4" />
									Change Models
								</Button>
								<Button
									variant="outline"
									onClick={() => window.location.reload()}
								>
									<RotateCcw className="size-4" />
									Reset
								</Button>
								<Button size="lg" onClick={playAgain} className="px-8">
									<Play className="size-4" />
									Play Again
								</Button>
							</div>
						</div>
					)}
				</div>
			</main>
			<SignupPrompt
				open={showSignupPrompt}
				onOpenChange={setShowSignupPrompt}
			/>
		</TooltipProvider>
	);
}
