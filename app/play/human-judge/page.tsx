"use client";

import {
	Check,
	Clock,
	Coins,
	Dices,
	DollarSign,
	Play,
	RotateCcw,
	Trophy,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ModelSelector,
	ModelSelectorTrigger,
} from "@/components/model-selector";
import { SignupPrompt } from "@/components/signup-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
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
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import type { Drawing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GameState {
	status: "idle" | "generating" | "voting" | "results";
	prompt: string;
	drawings: Drawing[];
	selectedDrawing: string | null;
	leaderboard: Record<string, number>;
	roundsPlayed: number;
	totalTimeMs: number;
	roundCost: number;
	totalCost: number;
	totalTokens: number;
}

interface GeneratingModel {
	id: string;
	name: string;
	color: string;
	status: "pending" | "streaming" | "done" | "error";
	svg?: string;
	timeMs?: number;
}

const MAX_MODELS = 8;
const MODEL_TIMEOUT = 45;

export default function HumanJudgePage() {
	const saveSession = useSaveSession();
	const { isAuthenticated } = useUserIdentity();
	const [showSignupPrompt, setShowSignupPrompt] = useState(false);
	const [hasShownPrompt, setHasShownPrompt] = useState(false);
	const [selectedModelIds, setSelectedModelIds] =
		useState<string[]>(DEFAULT_MODELS);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const [gameState, setGameState] = useState<GameState>({
		status: "idle",
		prompt: "",
		drawings: [],
		selectedDrawing: null,
		leaderboard: {},
		roundsPlayed: 0,
		totalTimeMs: 0,
		roundCost: 0,
		totalCost: 0,
		totalTokens: 0,
	});

	const [generatingModels, setGeneratingModels] = useState<GeneratingModel[]>(
		[],
	);
	const [elapsedTime, setElapsedTime] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const isGameActive =
		gameState.status === "generating" || gameState.status === "voting";

	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	useEffect(() => {
		if (gameState.status === "generating") {
			startTimeRef.current = Date.now();
			const interval = setInterval(() => {
				if (startTimeRef.current) {
					const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
					setElapsedTime(elapsed);

					if (elapsed >= MODEL_TIMEOUT) {
						abortControllerRef.current?.abort();
						setGeneratingModels((prev) =>
							prev.map((m) =>
								m.status === "pending" || m.status === "streaming"
									? { ...m, status: "error", timeMs: MODEL_TIMEOUT * 1000 }
									: m,
							),
						);
					}
				}
			}, 1000);
			return () => clearInterval(interval);
		}
		setElapsedTime(0);
		startTimeRef.current = null;
	}, [gameState.status]);

	useEffect(() => {
		if (gameState.status !== "generating" || generatingModels.length === 0) return;

		const allFinished = generatingModels.every(
			(m) => m.status === "done" || m.status === "error",
		);
		const hasAtLeastOneSuccess = generatingModels.some((m) => m.status === "done");

		if (allFinished && hasAtLeastOneSuccess) {
			const completedDrawings = generatingModels
				.filter((m) => m.status === "done" && m.svg)
				.map((m) => ({
					modelId: m.id,
					svg: m.svg!,
					generationTimeMs: m.timeMs || 0,
					chunks: [],
				}));

			const shuffledDrawings = [...completedDrawings].sort(() => Math.random() - 0.5);

			setGameState((prev) => ({
				...prev,
				status: "voting",
				drawings: shuffledDrawings as Drawing[],
			}));
		} else if (allFinished && !hasAtLeastOneSuccess) {
			setGameState((prev) => ({ ...prev, status: "idle" }));
		}
	}, [generatingModels, gameState.status]);

	const handleRandomModels = useCallback(() => {
		const shuffled = shuffleModels(AVAILABLE_MODELS, 4);
		setSelectedModelIds(shuffled.map((m) => m.id));
	}, []);

	const timeRemaining = MODEL_TIMEOUT - elapsedTime;
	const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
	const isCritical = timeRemaining <= 5 && timeRemaining > 0;

	const completedCount = useMemo(
		() => generatingModels.filter((m) => m.status === "done").length,
		[generatingModels],
	);

	const streamingCount = useMemo(
		() => generatingModels.filter((m) => m.status === "streaming").length,
		[generatingModels],
	);

	const startRound = useCallback(async () => {
		if (selectedModelIds.length < 2) return;

		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();

		const prompt = getRandomPrompt();

		setGameState((prev) => ({
			...prev,
			status: "generating",
			prompt,
			drawings: [],
			selectedDrawing: null,
			roundCost: 0,
		}));

		setGeneratingModels(
			selectedModelIds.map((modelId) => {
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
				body: JSON.stringify({ prompt, models: selectedModelIds }),
				signal: abortControllerRef.current.signal,
			});

			if (!response.ok) throw new Error("Failed to generate drawings");

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";
			const completedDrawings: Drawing[] = [];
			const chunksMap = new Map<string, string[]>();
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
							setGeneratingModels((prev) =>
								prev.map((m) => ({ ...m, status: "pending" })),
							);
						} else if (event.type === "partial") {
							if (!chunksMap.has(event.modelId)) {
								chunksMap.set(event.modelId, []);
							}
							chunksMap.get(event.modelId)?.push(event.svg);

							setGeneratingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? { ...m, status: "streaming", svg: event.svg }
										: m,
								),
							);
						} else if (event.type === "drawing") {
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
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}
			console.error("Error:", error);
			setGameState((prev) => ({ ...prev, status: "idle" }));
		}
	}, [selectedModelIds]);

	const selectDrawing = useCallback((modelId: string) => {
		setGameState((prev) => ({ ...prev, selectedDrawing: modelId }));
	}, []);

	const confirmVote = useCallback(() => {
		if (!gameState.selectedDrawing) return;

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

	const resetGame = useCallback(() => {
		abortControllerRef.current?.abort();
		setGameState({
			status: "idle",
			prompt: "",
			drawings: [],
			selectedDrawing: null,
			leaderboard: {},
			roundsPlayed: 0,
			totalTimeMs: 0,
			roundCost: 0,
			totalCost: 0,
			totalTokens: 0,
		});
		setGeneratingModels([]);
	}, []);

	const gridCols = useMemo(() => {
		const count = generatingModels.length || selectedModelIds.length;
		if (count <= 2) return "grid-cols-2";
		if (count <= 4) return "grid-cols-2 md:grid-cols-4";
		if (count <= 6) return "grid-cols-2 md:grid-cols-3";
		return "grid-cols-2 md:grid-cols-4";
	}, [generatingModels.length, selectedModelIds.length]);

	return (
		<TooltipProvider>
			<div className="space-y-6">
				{/* Header */}
				<header className="flex flex-col sm:flex-row sm:items-center gap-3">
					<div className="flex items-center gap-2">
						<ButtonGroup>
							<ModelSelectorTrigger
								models={AVAILABLE_MODELS}
								selectedIds={selectedModelIds}
								onClick={() => setModelSelectorOpen(true)}
								disabled={isGameActive}
							/>
							<Button
								variant="outline"
								onClick={handleRandomModels}
								disabled={isGameActive}
								className="h-auto py-1.5 px-2 sm:px-3 gap-1.5"
							>
								<Dices className="size-3.5 sm:size-4" />
								<span className="text-xs font-medium hidden sm:inline">
									Random
								</span>
							</Button>
						</ButtonGroup>
					</div>

					<div className="flex items-center gap-2 ml-auto">
						{gameState.roundsPlayed > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="outline" className="cursor-help gap-1">
										<DollarSign className="size-3" />
										{formatCost(gameState.totalCost)}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Total session cost</p>
									<p className="text-xs text-muted-foreground">
										{gameState.totalTokens.toLocaleString()} tokens
									</p>
								</TooltipContent>
							</Tooltip>
						)}
						<Badge variant="secondary" className="gap-1">
							<Trophy className="size-3" />
							Round {gameState.roundsPlayed + 1}
						</Badge>
						{gameState.status === "idle" && (
							<Button
								onClick={startRound}
								disabled={selectedModelIds.length < 2}
								className="gap-1.5"
							>
								<Play className="size-4" />
								{selectedModelIds.length < 2 ? "Select 2+" : "Start Battle"}
							</Button>
						)}
					</div>
				</header>

				{/* Idle State */}
				{gameState.status === "idle" && (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<h2 className="text-xl font-medium">Today's Contenders</h2>
							<p className="text-sm text-muted-foreground">
								{selectedModelIds.length} AI models ready to draw
							</p>
						</div>

						<div className={cn("grid gap-3", gridCols)}>
							{selectedModelIds.map((id, index) => {
								const model = getModelById(id);
								if (!model) return null;
								return (
									<Card
										key={id}
										className="group overflow-hidden hover:shadow-md transition-all hover:scale-[1.02]"
									>
										<div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative">
											<div
												className="size-16 rounded-full shadow-lg group-hover:scale-110 transition-transform"
												style={{ backgroundColor: model.color }}
											/>
											<div className="absolute top-2 left-2">
												<Badge variant="secondary" className="text-xs font-mono">
													#{index + 1}
												</Badge>
											</div>
										</div>
										<div className="p-3 border-t">
											<div className="flex items-center gap-2">
												<div
													className="size-2.5 rounded-full shrink-0"
													style={{ backgroundColor: model.color }}
												/>
												<span className="text-sm font-medium truncate">
													{model.name}
												</span>
											</div>
											<div className="text-xs text-muted-foreground mt-1">
												{model.provider}
											</div>
										</div>
									</Card>
								);
							})}
						</div>

						{selectedModelIds.length >= 2 && (
							<div className="text-center pt-2">
								<p className="text-sm text-muted-foreground mb-3">
									Click <span className="font-medium text-foreground">Start Battle</span> to begin!
								</p>
							</div>
						)}

						{selectedModelIds.length < 2 && (
							<div className="text-center py-8">
								<p className="text-muted-foreground">
									Select at least 2 models to start a battle
								</p>
							</div>
						)}
					</div>
				)}

				{/* Generating State */}
				{gameState.status === "generating" && (
					<div className="space-y-6">
						<div className="text-center space-y-3">
							<Badge variant="secondary" className="text-base px-4 py-1.5">
								&ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<div className="flex items-center justify-center gap-3 text-sm">
								<Badge
									variant="outline"
									className={cn(
										"tabular-nums font-mono transition-colors",
										isCritical && "border-red-500 text-red-500 animate-pulse",
										isUrgent && !isCritical && "border-yellow-500 text-yellow-500",
										!isUrgent && !isCritical && "text-muted-foreground",
									)}
								>
									<Clock
										className={cn(
											"size-3 mr-1",
											isCritical && "animate-spin",
										)}
									/>
									{timeRemaining > 0 ? `${timeRemaining}s left` : "Time's up!"}
								</Badge>
								<div className="flex items-center gap-1.5 text-muted-foreground">
									{streamingCount > 0 && (
										<span className="text-blue-500">
											{streamingCount} drawing
										</span>
									)}
									{streamingCount > 0 && completedCount > 0 && " · "}
									{completedCount > 0 && (
										<span className="text-green-500">{completedCount} done</span>
									)}
									{streamingCount === 0 && completedCount === 0 && (
										<span>Connecting...</span>
									)}
								</div>
							</div>
						</div>

						<div className={cn("grid gap-4", gridCols)}>
							{generatingModels.map((model) => (
								<Card
									key={model.id}
									className={cn(
										"overflow-hidden transition-all",
										model.status === "streaming" && "ring-2 ring-blue-500/30",
										model.status === "done" && "ring-2 ring-green-500/30",
										model.status === "error" && "ring-2 ring-red-500/30 opacity-60",
									)}
								>
									<div className="aspect-square bg-white relative flex items-center justify-center overflow-hidden">
										{model.status === "pending" && (
											<>
												<div className="text-center space-y-2 text-muted-foreground">
													<Spinner className="size-6 mx-auto opacity-50" />
													<span className="text-xs">Waiting...</span>
												</div>
												<div className="absolute top-2 right-2">
													<Badge
														variant="outline"
														className={cn(
															"text-[10px] bg-background/80 backdrop-blur-sm tabular-nums",
															isCritical && "border-red-500 text-red-500",
															isUrgent && !isCritical && "border-yellow-500 text-yellow-500",
														)}
													>
														{timeRemaining}s
													</Badge>
												</div>
											</>
										)}
										{(model.status === "streaming" || model.status === "done") &&
											model.svg && (
												<div
													className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
													dangerouslySetInnerHTML={{ __html: model.svg }}
												/>
											)}
										{model.status === "error" && (
											<div className="text-center space-y-2 text-red-500">
												<X className="size-8 mx-auto" />
												<span className="text-xs">
													{model.timeMs === MODEL_TIMEOUT * 1000 ? "Timed out" : "Failed"}
												</span>
											</div>
										)}
										{(model.status === "streaming" || model.status === "done") && (
											<div className="absolute top-2 right-2">
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] bg-background/80 backdrop-blur-sm tabular-nums",
														model.status === "streaming" && isCritical && "border-red-500 text-red-500",
														model.status === "streaming" && isUrgent && !isCritical && "border-yellow-500 text-yellow-500",
														model.status === "done" && "border-green-500 text-green-600",
													)}
												>
													{model.status === "done" && model.timeMs
														? `${(model.timeMs / 1000).toFixed(1)}s ✓`
														: `${timeRemaining}s`}
												</Badge>
											</div>
										)}
									</div>
									<div className="p-2.5 border-t bg-card flex items-center gap-2">
										<div
											className={cn(
												"size-2.5 rounded-full",
												model.status === "streaming" && "animate-pulse",
											)}
											style={{ backgroundColor: model.color }}
										/>
										<span className="text-xs font-medium text-muted-foreground">
											???
										</span>
									</div>
								</Card>
							))}
						</div>
					</div>
				)}

				{/* Voting State */}
				{gameState.status === "voting" && (
					<div className="space-y-6">
						<div className="text-center space-y-3">
							<Badge variant="secondary" className="text-base px-4 py-1.5">
								&ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<h2 className="text-lg font-light text-muted-foreground">
								Pick your favorite
							</h2>
							<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
								<div className="flex items-center gap-1.5">
									<Clock className="size-4" />
									<span className="tabular-nums">
										{(gameState.totalTimeMs / 1000).toFixed(1)}s
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<Coins className="size-4" />
									<span className="tabular-nums">
										{formatCost(gameState.roundCost)}
									</span>
								</div>
							</div>
						</div>

						<div className={cn("grid gap-4", gridCols)}>
							{generatingModels.map((model, index) => {
								const drawing = gameState.drawings.find(
									(d) => d.modelId === model.id,
								);
								const isError = model.status === "error";
								const isSelected = gameState.selectedDrawing === model.id;

								if (isError || !drawing) {
									return (
										<Card
											key={model.id}
											className="overflow-hidden opacity-50 ring-2 ring-red-500/30"
										>
											<div className="aspect-square bg-muted flex items-center justify-center">
												<div className="text-center space-y-2 text-red-500">
													<X className="size-8 mx-auto" />
													<span className="text-xs">Failed</span>
												</div>
											</div>
											<div className="p-3 border-t">
												<span className="text-sm font-medium text-muted-foreground">
													{String.fromCharCode(65 + index)}
												</span>
											</div>
										</Card>
									);
								}

								return (
									<Card
										key={model.id}
										className={cn(
											"group overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
											isSelected
												? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]"
												: "hover:ring-2 hover:ring-primary/30",
										)}
										onClick={() => selectDrawing(model.id)}
									>
										<div className="aspect-square bg-white relative overflow-hidden">
											<div
												className="w-full h-full transition-transform group-hover:scale-105 [&>svg]:w-full [&>svg]:h-full"
												dangerouslySetInnerHTML={{ __html: drawing.svg }}
											/>
											{isSelected && (
												<>
													<div className="absolute inset-0 bg-primary/10" />
													<div className="absolute top-3 right-3 size-7 rounded-full bg-primary flex items-center justify-center shadow-lg animate-in zoom-in">
														<Check className="size-4 text-primary-foreground" />
													</div>
												</>
											)}
										</div>
										<div className="p-3 border-t flex items-center justify-between">
											<span
												className={cn(
													"text-sm font-medium transition-colors",
													isSelected ? "text-primary" : "text-muted-foreground",
												)}
											>
												{String.fromCharCode(65 + index)}
											</span>
											<Badge variant="outline" className="text-xs tabular-nums">
												{(drawing.generationTimeMs / 1000).toFixed(1)}s
											</Badge>
										</div>
									</Card>
								);
							})}
						</div>

						<div className="flex justify-center pt-2">
							<Button
								size="lg"
								disabled={!gameState.selectedDrawing}
								onClick={confirmVote}
								className="px-8"
							>
								<Check className="size-4" />
								Confirm Selection
							</Button>
						</div>
					</div>
				)}

				{/* Results State */}
				{gameState.status === "results" && (
					<div className="space-y-6">
						<div className="text-center space-y-3">
							<Badge variant="secondary" className="text-base px-4 py-1.5">
								&ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<h2 className="text-xl font-light">And the winner is...</h2>
						</div>

						<div className={cn("grid gap-4", gridCols)}>
							{generatingModels.map((genModel) => {
								const drawing = gameState.drawings.find(
									(d) => d.modelId === genModel.id,
								);
								const model = getModelById(genModel.id);
								const isError = genModel.status === "error";
								const isWinner = gameState.selectedDrawing === genModel.id;

								if (isError || !drawing) {
									return (
										<Card
											key={genModel.id}
											className="overflow-hidden opacity-50 ring-2 ring-red-500/30"
										>
											<div className="aspect-square bg-muted flex items-center justify-center">
												<div className="text-center space-y-2 text-red-500">
													<X className="size-8 mx-auto" />
													<span className="text-xs">Failed</span>
												</div>
											</div>
											<div className="p-3 border-t">
												<div className="flex items-center gap-2">
													<div
														className="size-2.5 rounded-full"
														style={{ backgroundColor: model?.color }}
													/>
													<span className="text-sm text-muted-foreground">
														{model?.name}
													</span>
												</div>
											</div>
										</Card>
									);
								}

								return (
									<Card
										key={genModel.id}
										className={cn(
											"overflow-hidden transition-all",
											isWinner
												? "ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/20 scale-[1.02]"
												: "opacity-75 hover:opacity-100",
										)}
									>
										<div className="aspect-square bg-white relative">
											<div
												className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
												dangerouslySetInnerHTML={{ __html: drawing.svg }}
											/>
											{isWinner && (
												<div className="absolute top-3 right-3 animate-in zoom-in">
													<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 shadow-lg gap-1">
														<Trophy className="size-3" />
														Winner
													</Badge>
												</div>
											)}
										</div>
										<div
											className={cn(
												"p-3 border-t space-y-1.5",
												isWinner && "bg-yellow-500/5",
											)}
										>
											<div className="flex items-center gap-2">
												<div
													className="size-2.5 rounded-full"
													style={{ backgroundColor: model?.color }}
												/>
												<span
													className={cn(
														"text-sm font-medium",
														isWinner && "text-yellow-600 dark:text-yellow-400",
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
															{drawing.usage?.totalTokens?.toLocaleString() || 0}{" "}
															tokens
														</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</div>
									</Card>
								);
							})}
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-center gap-2 sm:gap-3">
							<Button
								variant="outline"
								onClick={resetGame}
								size="sm"
								className="flex-1 sm:flex-none sm:px-6"
							>
								<RotateCcw className="size-4" />
								<span className="hidden sm:inline">Reset</span>
							</Button>
							<Button
								onClick={startRound}
								size="sm"
								className="flex-1 sm:flex-none sm:px-8"
							>
								<Play className="size-4" />
								Play Again
							</Button>
						</div>

						{/* Leaderboard */}
						<Card>
							<div className="p-3 sm:p-4 border-b bg-muted/30 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Trophy className="size-4 text-yellow-500" />
									<h3 className="font-medium text-sm sm:text-base">Leaderboard</h3>
								</div>
								<span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
									{gameState.roundsPlayed} rounds
								</span>
							</div>
							<CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
								{[...selectedModelIds]
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
											<div key={model.id} className="space-y-1.5">
												<div className="flex items-center justify-between text-sm">
													<div className="flex items-center gap-2">
														<span
															className={cn(
																"w-5 text-center font-mono text-xs",
																isLeader
																	? "text-yellow-500 font-bold"
																	: "text-muted-foreground",
															)}
														>
															{index + 1}
														</span>
														<div
															className="size-2.5 rounded-full"
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
															<Trophy className="size-3.5 text-yellow-500" />
														)}
													</div>
													<span className="text-muted-foreground tabular-nums text-xs">
														{wins} win{wins !== 1 ? "s" : ""} ({percentage.toFixed(0)}%)
													</span>
												</div>
												<Progress
													value={percentage}
													className={cn(
														"h-1.5",
														isLeader && "[&>div]:bg-yellow-500",
													)}
												/>
											</div>
										);
									})}
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			<ModelSelector
				models={AVAILABLE_MODELS}
				selectedIds={selectedModelIds}
				onSelectionChange={setSelectedModelIds}
				open={modelSelectorOpen}
				onOpenChange={setModelSelectorOpen}
				disabled={isGameActive}
			/>

			<SignupPrompt
				open={showSignupPrompt}
				onOpenChange={setShowSignupPrompt}
			/>
		</TooltipProvider>
	);
}
