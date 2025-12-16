"use client";

import {
	Check,
	Clock,
	Dices,
	DollarSign,
	Pencil,
	Play,
	RotateCcw,
	Send,
	Trophy,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/drawing-canvas";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSaveSession } from "@/lib/hooks/use-gallery";
import { useUserIdentity } from "@/lib/hooks/use-user-identity";
import {
	DEFAULT_VISION_MODELS,
	formatCost,
	getModelById,
	getVisionModels,
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface GameState {
	status: "idle" | "drawing" | "guessing" | "results";
	prompt: string;
	guesses: Guess[];
	leaderboard: Record<string, number>;
	roundsPlayed: number;
	totalCost: number;
	totalTokens: number;
}

interface Guess {
	modelId: string;
	guess: string;
	isCorrect: boolean;
	generationTimeMs: number;
	cost?: number;
	tokens?: number;
}

interface GuessingModel {
	id: string;
	name: string;
	color: string;
	status: "pending" | "guessing" | "done" | "error";
	guess?: string;
	timeMs?: number;
	isCorrect?: boolean;
}

const MODEL_TIMEOUT = 30;

export default function ModelGuessPage() {
	const saveSession = useSaveSession();
	const { isAuthenticated } = useUserIdentity();
	const [showSignupPrompt, setShowSignupPrompt] = useState(false);
	const [hasShownPrompt, setHasShownPrompt] = useState(false);
	const [selectedModelIds, setSelectedModelIds] =
		useState<string[]>(DEFAULT_VISION_MODELS);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const [gameState, setGameState] = useState<GameState>({
		status: "idle",
		prompt: "",
		guesses: [],
		leaderboard: {},
		roundsPlayed: 0,
		totalCost: 0,
		totalTokens: 0,
	});

	const [guessingModels, setGuessingModels] = useState<GuessingModel[]>([]);
	const [drawingDataUrl, setDrawingDataUrl] = useState<string>("");
	const [elapsedTime, setElapsedTime] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const visionModels = useMemo(() => getVisionModels(), []);

	const isGameActive =
		gameState.status === "drawing" || gameState.status === "guessing";

	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	useEffect(() => {
		if (gameState.status === "guessing") {
			startTimeRef.current = Date.now();
			const interval = setInterval(() => {
				if (startTimeRef.current) {
					const elapsed = Math.floor(
						(Date.now() - startTimeRef.current) / 1000,
					);
					setElapsedTime(elapsed);

					if (elapsed >= MODEL_TIMEOUT) {
						abortControllerRef.current?.abort();
						setGuessingModels((prev) =>
							prev.map((m) =>
								m.status === "pending" || m.status === "guessing"
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
		if (gameState.status !== "guessing" || guessingModels.length === 0) return;

		const allFinished = guessingModels.every(
			(m) => m.status === "done" || m.status === "error",
		);
		const hasAtLeastOneSuccess = guessingModels.some(
			(m) => m.status === "done",
		);

		if (allFinished) {
			const completedGuesses = guessingModels
				.filter((m) => m.status === "done" && m.guess)
				.map((m) => ({
					modelId: m.id,
					guess: m.guess!,
					isCorrect: m.isCorrect || false,
					generationTimeMs: m.timeMs || 0,
				}));

			const firstCorrect = completedGuesses.find((g) => g.isCorrect);
			const newLeaderboard = { ...gameState.leaderboard };
			if (firstCorrect) {
				newLeaderboard[firstCorrect.modelId] =
					(newLeaderboard[firstCorrect.modelId] || 0) + 1;
			}

			if (hasAtLeastOneSuccess) {
				setGameState((prev) => ({
					...prev,
					status: "results",
					guesses: completedGuesses,
					leaderboard: newLeaderboard,
					roundsPlayed: prev.roundsPlayed + 1,
				}));
			} else {
				setGameState((prev) => ({ ...prev, status: "drawing" }));
			}
		}
	}, [guessingModels, gameState.status, gameState.leaderboard]);

	const handleRandomModels = useCallback(() => {
		const shuffled = shuffleModels(visionModels, 4);
		setSelectedModelIds(shuffled.map((m) => m.id));
	}, [visionModels]);

	const timeRemaining = MODEL_TIMEOUT - elapsedTime;
	const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
	const isCritical = timeRemaining <= 5 && timeRemaining > 0;

	const checkGuess = useCallback((guess: string, prompt: string): boolean => {
		const normalizedGuess = guess.toLowerCase().trim();
		const normalizedPrompt = prompt.toLowerCase().trim();

		if (
			normalizedGuess.includes(normalizedPrompt) ||
			normalizedPrompt.includes(normalizedGuess)
		) {
			return true;
		}

		const promptWords = normalizedPrompt.split(/\s+/);
		const guessWords = normalizedGuess.split(/\s+/);
		const significantWords = promptWords.filter((w) => w.length > 2);
		return significantWords.some((word) =>
			guessWords.some((gw) => gw.includes(word) || word.includes(gw)),
		);
	}, []);

	const startDrawing = useCallback(() => {
		if (selectedModelIds.length < 2) return;
		const prompt = getRandomPrompt();
		setDrawingDataUrl("");
		setGameState((prev) => ({
			...prev,
			status: "drawing",
			prompt,
			guesses: [],
		}));
	}, [selectedModelIds.length]);

	const submitDrawing = useCallback(async () => {
		if (!drawingDataUrl) return;

		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();

		setGameState((prev) => ({ ...prev, status: "guessing" }));

		setGuessingModels(
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
			const response = await fetch("/api/guess-drawing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					imageDataUrl: drawingDataUrl,
					models: selectedModelIds,
				}),
				signal: abortControllerRef.current.signal,
			});

			if (!response.ok) throw new Error("Failed to get guesses");

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";
			const completedGuesses: Guess[] = [];
			let totalCost = 0;
			let totalTokens = 0;

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
							setGuessingModels((prev) =>
								prev.map((m) => ({ ...m, status: "pending" })),
							);
						} else if (event.type === "partial") {
							setGuessingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? { ...m, status: "guessing", guess: event.guess }
										: m,
								),
							);
						} else if (event.type === "guess") {
							const isCorrect = checkGuess(event.guess, gameState.prompt);
							setGuessingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? {
												...m,
												status: "done",
												guess: event.guess,
												timeMs: event.generationTimeMs,
												isCorrect,
											}
										: m,
								),
							);
							completedGuesses.push({
								modelId: event.modelId,
								guess: event.guess,
								isCorrect,
								generationTimeMs: event.generationTimeMs,
								cost: event.cost,
								tokens: event.usage?.totalTokens,
							});
						} else if (event.type === "error") {
							setGuessingModels((prev) =>
								prev.map((m) =>
									m.id === event.modelId
										? { ...m, status: "error", timeMs: event.generationTimeMs }
										: m,
								),
							);
						} else if (event.type === "complete") {
							totalCost = event.totalCost;
							totalTokens = event.totalTokens;
						}
					} catch (e) {
						console.error("Failed to parse SSE event:", e);
					}
				}
			}

			const firstCorrect = completedGuesses.find((g) => g.isCorrect);
			const newLeaderboard = { ...gameState.leaderboard };
			if (firstCorrect) {
				newLeaderboard[firstCorrect.modelId] =
					(newLeaderboard[firstCorrect.modelId] || 0) + 1;
			}

			saveSession.mutate({
				mode: "model_guess",
				prompt: gameState.prompt,
				totalCost,
				totalTokens,
				drawings: [],
				guesses: completedGuesses.map((g) => ({
					modelId: g.modelId,
					guess: g.guess,
					isCorrect: g.isCorrect,
					generationTimeMs: g.generationTimeMs,
					cost: g.cost,
					tokens: g.tokens,
				})),
			});

			setGameState((prev) => {
				const newState = {
					...prev,
					status: "results" as const,
					guesses: completedGuesses,
					leaderboard: newLeaderboard,
					roundsPlayed: prev.roundsPlayed + 1,
					totalCost: prev.totalCost + totalCost,
					totalTokens: prev.totalTokens + totalTokens,
				};

				if (!isAuthenticated && !hasShownPrompt) {
					setTimeout(() => {
						setShowSignupPrompt(true);
						setHasShownPrompt(true);
					}, 1000);
				}

				return newState;
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}
			console.error("Error:", error);
			setGameState((prev) => ({ ...prev, status: "drawing" }));
		}
	}, [
		drawingDataUrl,
		selectedModelIds,
		gameState.prompt,
		gameState.leaderboard,
		checkGuess,
		hasShownPrompt,
		isAuthenticated,
		saveSession,
	]);

	const resetGame = useCallback(() => {
		abortControllerRef.current?.abort();
		setDrawingDataUrl("");
		setGameState({
			status: "idle",
			prompt: "",
			guesses: [],
			leaderboard: {},
			roundsPlayed: 0,
			totalCost: 0,
			totalTokens: 0,
		});
		setGuessingModels([]);
	}, []);

	const gridCols = useMemo(() => {
		const count = selectedModelIds.length;
		if (count <= 2) return "grid-cols-2";
		if (count <= 4) return "grid-cols-2 md:grid-cols-4";
		return "grid-cols-2 md:grid-cols-3";
	}, [selectedModelIds.length]);

	return (
		<TooltipProvider>
			<div className={cn(
				gameState.status === "drawing" ? "flex flex-col h-full" : "space-y-6"
			)}>
				{/* Header */}
				<header className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
					<div className="flex items-center gap-2">
						<ButtonGroup>
							<ModelSelectorTrigger
								models={visionModels}
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
								onClick={startDrawing}
								disabled={selectedModelIds.length < 2}
								className="gap-1.5"
							>
								<Pencil className="size-4" />
								{selectedModelIds.length < 2 ? "Select 2+" : "Start Drawing"}
							</Button>
						)}
					</div>
				</header>

				{/* Idle State */}
				{gameState.status === "idle" && (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<h2 className="text-xl font-medium">Your Guessers</h2>
							<p className="text-sm text-muted-foreground">
								{selectedModelIds.length} AI models ready to guess your drawings
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
												<Badge
													variant="secondary"
													className="text-xs font-mono"
												>
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
									Click{" "}
									<span className="font-medium text-foreground">
										Start Drawing
									</span>{" "}
									to begin!
								</p>
							</div>
						)}

						{selectedModelIds.length < 2 && (
							<div className="text-center py-8">
								<p className="text-muted-foreground">
									Select at least 2 models to start
								</p>
							</div>
						)}
					</div>
				)}

				{/* Drawing Phase */}
				{gameState.status === "drawing" && (
					<div className="flex-1 flex flex-col min-h-0">
						{/* Header with prompt and actions - always visible */}
						<div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
							<Badge
								variant="secondary"
								className="text-sm sm:text-base px-3 py-1"
							>
								Draw: &ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={resetGame}>
									<X className="size-4" />
									<span className="hidden sm:inline">Cancel</span>
								</Button>
								<Button
									size="sm"
									onClick={submitDrawing}
									disabled={!drawingDataUrl}
									className="px-4 sm:px-6 gap-1.5"
								>
									<Send className="size-4" />
									Submit for AI
								</Button>
							</div>
						</div>

						{/* Canvas - takes remaining height */}
						<div className="flex-1 min-h-0 overflow-hidden">
							<DrawingCanvas onDrawingChange={setDrawingDataUrl} />
						</div>
					</div>
				)}

				{/* Guessing Phase */}
				{gameState.status === "guessing" && (
					<div className="space-y-4">
						<div className="text-center space-y-2">
							<Badge
								variant="secondary"
								className="text-base sm:text-lg px-4 py-1.5"
							>
								&ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<div className="flex items-center justify-center gap-3 text-sm">
								<Badge
									variant="outline"
									className={cn(
										"tabular-nums font-mono transition-colors",
										isCritical && "border-red-500 text-red-500 animate-pulse",
										isUrgent &&
											!isCritical &&
											"border-yellow-500 text-yellow-500",
										!isUrgent && !isCritical && "text-muted-foreground",
									)}
								>
									<Clock
										className={cn("size-3 mr-1", isCritical && "animate-spin")}
									/>
									{timeRemaining > 0 ? `${timeRemaining}s left` : "Time's up!"}
								</Badge>
								<span className="text-muted-foreground">
									{guessingModels.filter((m) => m.status === "done").length}/
									{guessingModels.length} guessed
								</span>
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<Card className="overflow-hidden">
								<div className="aspect-square bg-white">
									{drawingDataUrl && (
										<img
											src={drawingDataUrl}
											alt="Your drawing"
											className="w-full h-full object-contain"
										/>
									)}
								</div>
							</Card>

							<div className="space-y-2">
								{guessingModels.map((model) => (
									<Card
										key={model.id}
										className={cn(
											"transition-all",
											model.status === "done" &&
												model.isCorrect &&
												"ring-2 ring-green-500",
											model.status === "error" &&
												"ring-2 ring-red-500/50 opacity-60",
										)}
									>
										<CardContent className="p-3">
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"size-2.5 rounded-full shrink-0",
														model.status === "guessing" && "animate-pulse",
													)}
													style={{ backgroundColor: model.color }}
												/>
												<span className="text-sm font-medium flex-1 truncate">
													{model.name}
												</span>
												{(model.status === "pending" ||
													model.status === "guessing") && (
													<Badge
														variant="outline"
														className={cn(
															"text-[10px] tabular-nums",
															isCritical && "border-red-500 text-red-500",
															isUrgent &&
																!isCritical &&
																"border-yellow-500 text-yellow-500",
														)}
													>
														{timeRemaining}s
													</Badge>
												)}
												{model.status === "done" && model.timeMs && (
													<Badge
														variant="outline"
														className="text-[10px] tabular-nums border-green-500 text-green-600"
													>
														{(model.timeMs / 1000).toFixed(1)}s
													</Badge>
												)}
												{model.status === "done" && model.isCorrect && (
													<Check className="size-4 text-green-500" />
												)}
												{model.status === "error" && (
													<X className="size-4 text-red-500" />
												)}
											</div>
											{(model.status === "guessing" ||
												model.status === "done") &&
												model.guess && (
													<div
														className={cn(
															"mt-1.5 text-sm font-medium truncate",
															model.status === "done" &&
																model.isCorrect &&
																"text-green-500",
														)}
													>
														&ldquo;{model.guess}&rdquo;
													</div>
												)}
											{model.status === "error" && (
												<div className="mt-1.5 text-xs text-red-500">
													{(model.timeMs || 0) >= MODEL_TIMEOUT * 1000
														? "Timed out"
														: "Failed"}
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Results Phase */}
				{gameState.status === "results" && (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<Badge
								variant="secondary"
								className="text-base sm:text-lg px-4 py-1.5"
							>
								Answer: &ldquo;{gameState.prompt}&rdquo;
							</Badge>
							<h2 className="text-lg font-light">
								{gameState.guesses.some((g) => g.isCorrect)
									? "Someone got it!"
									: "No one guessed it!"}
							</h2>
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
								onClick={startDrawing}
								size="sm"
								className="flex-1 sm:flex-none sm:px-8"
							>
								<Play className="size-4" />
								Play Again
							</Button>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<Card className="overflow-hidden">
								<div className="aspect-square bg-white">
									{drawingDataUrl && (
										<img
											src={drawingDataUrl}
											alt="Your drawing"
											className="w-full h-full object-contain"
										/>
									)}
								</div>
							</Card>

							<div className="space-y-2">
								{guessingModels.map((model) => {
									const guess = gameState.guesses.find(
										(g) => g.modelId === model.id,
									);
									const isWinner =
										guess?.isCorrect &&
										gameState.guesses.find((g) => g.isCorrect)?.modelId ===
											model.id;

									return (
										<Card
											key={model.id}
											className={cn(
												"transition-all",
												isWinner &&
													"ring-2 ring-yellow-500 bg-yellow-500/5",
												guess?.isCorrect &&
													!isWinner &&
													"ring-2 ring-green-500/50",
												model.status === "error" && "opacity-50",
											)}
										>
											<CardContent className="p-3">
												<div className="flex items-center gap-2">
													<div
														className="size-2.5 rounded-full shrink-0"
														style={{ backgroundColor: model.color }}
													/>
													<span className="text-sm font-medium flex-1 truncate">
														{model.name}
													</span>
													{isWinner && (
														<Badge className="bg-yellow-500 text-yellow-950 text-[10px]">
															<Trophy className="size-3" />
															Winner
														</Badge>
													)}
													{guess?.isCorrect && !isWinner && (
														<Badge
															variant="outline"
															className="text-green-500 border-green-500 text-[10px]"
														>
															Correct
														</Badge>
													)}
													{guess && !guess.isCorrect && (
														<X className="size-4 text-red-500" />
													)}
												</div>
												{guess && (
													<div
														className={cn(
															"mt-1.5 text-sm truncate",
															guess.isCorrect
																? "text-green-500 font-medium"
																: "text-muted-foreground",
														)}
													>
														&ldquo;{guess.guess}&rdquo;
													</div>
												)}
												{model.status === "error" && (
													<div className="mt-1.5 text-xs text-red-500">
														Failed to guess
													</div>
												)}
											</CardContent>
										</Card>
									);
								})}
							</div>
						</div>

						{/* Leaderboard */}
						{gameState.roundsPlayed > 0 && (
							<Card>
								<div className="p-3 sm:p-4 border-b bg-muted/30 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Trophy className="size-4 text-yellow-500" />
										<h3 className="font-medium text-sm sm:text-base">
											Leaderboard
										</h3>
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
															{wins} win{wins !== 1 ? "s" : ""} (
															{percentage.toFixed(0)}%)
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
						)}
					</div>
				)}
			</div>

			<ModelSelector
				models={visionModels}
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
