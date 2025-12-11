"use client";

import {
	ArrowLeft,
	Check,
	Clock,
	DollarSign,
	Eye,
	Pencil,
	Play,
	RotateCcw,
	Send,
	Shuffle,
	Trophy,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { SignupPrompt } from "@/components/signup-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
	DEFAULT_VISION_MODELS,
	formatCost,
	getModelById,
	getVisionModels,
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface GameState {
	status: "setup" | "drawing" | "guessing" | "results";
	prompt: string;
	selectedModels: string[];
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

export default function ModelGuessPage() {
	const saveSession = useSaveSession();
	const { isAuthenticated } = useUserIdentity();
	const [showSignupPrompt, setShowSignupPrompt] = useState(false);
	const [hasShownPrompt, setHasShownPrompt] = useState(false);
	const [gameState, setGameState] = useState<GameState>({
		status: "setup",
		prompt: "",
		selectedModels: DEFAULT_VISION_MODELS,
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

	const visionModels = useMemo(() => getVisionModels(), []);

	// Timer for elapsed time during guessing
	useEffect(() => {
		if (gameState.status === "guessing") {
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

	const toggleModel = useCallback((modelId: string) => {
		setGameState((prev) => ({
			...prev,
			selectedModels: prev.selectedModels.includes(modelId)
				? prev.selectedModels.filter((id) => id !== modelId)
				: prev.selectedModels.length < 6
					? [...prev.selectedModels, modelId]
					: prev.selectedModels,
		}));
	}, []);

	const shuffleSelection = useCallback(() => {
		const shuffled = shuffleModels(visionModels, 4);
		setGameState((prev) => ({
			...prev,
			selectedModels: shuffled.map((m) => m.id),
		}));
	}, [visionModels]);

	const startGame = useCallback(() => {
		if (gameState.selectedModels.length < 2) return;
		const prompt = getRandomPrompt();
		setGameState((prev) => ({
			...prev,
			status: "drawing",
			prompt,
			guesses: [],
			leaderboard: prev.roundsPlayed === 0 ? {} : prev.leaderboard,
		}));
	}, [gameState.selectedModels.length]);

	// Check if guess matches prompt (simple fuzzy matching)
	const checkGuess = useCallback((guess: string, prompt: string): boolean => {
		const normalizedGuess = guess.toLowerCase().trim();
		const normalizedPrompt = prompt.toLowerCase().trim();

		// Direct match
		if (
			normalizedGuess.includes(normalizedPrompt) ||
			normalizedPrompt.includes(normalizedGuess)
		) {
			return true;
		}

		// Check individual words
		const promptWords = normalizedPrompt.split(/\s+/);
		const guessWords = normalizedGuess.split(/\s+/);

		// If any significant word matches
		const significantWords = promptWords.filter((w) => w.length > 2);
		return significantWords.some((word) =>
			guessWords.some((gw) => gw.includes(word) || word.includes(gw)),
		);
	}, []);

	const submitDrawing = useCallback(async () => {
		if (!drawingDataUrl) return;

		setGameState((prev) => ({
			...prev,
			status: "guessing",
		}));

		// Initialize guessing models state
		setGuessingModels(
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
			const response = await fetch("/api/guess-drawing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					imageDataUrl: drawingDataUrl,
					models: gameState.selectedModels,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to get guesses");
			}

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

			// Calculate scores - first correct guess gets a point
			const firstCorrect = completedGuesses.find((g) => g.isCorrect);
			const newLeaderboard = { ...gameState.leaderboard };
			if (firstCorrect) {
				newLeaderboard[firstCorrect.modelId] =
					(newLeaderboard[firstCorrect.modelId] || 0) + 1;
			}

			// Auto-save to gallery (outside of state updater to avoid duplicate calls)
			saveSession.mutate({
				mode: "model_guess",
				prompt: gameState.prompt,
				totalCost: totalCost,
				totalTokens: totalTokens,
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
			console.error("Error:", error);
			setGameState((prev) => ({
				...prev,
				status: "drawing",
			}));
		}
	}, [
		drawingDataUrl,
		gameState.selectedModels,
		gameState.prompt,
		gameState.leaderboard,
		checkGuess,
		hasShownPrompt,
		isAuthenticated, // Auto-save to gallery (outside of state updater to avoid duplicate calls)
		saveSession.mutate,
	]);

	const playAgain = useCallback(() => {
		const prompt = getRandomPrompt();
		setDrawingDataUrl("");
		setGameState((prev) => ({
			...prev,
			status: "drawing",
			prompt,
			guesses: [],
		}));
	}, []);

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
							<h1 className="text-2xl font-mono font-light">Model Guess</h1>
							<p className="text-sm text-muted-foreground">
								You draw, AI guesses
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
						<div className="space-y-6">
							<div className="text-center space-y-2">
								<Eye className="size-12 mx-auto text-primary" />
								<h2 className="text-2xl font-light">Select Vision Models</h2>
								<p className="text-muted-foreground">
									Choose AI models that will try to guess your drawings
								</p>
							</div>

							<Card>
								<CardContent className="p-6">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
										{visionModels.map((model) => {
											const isSelected = gameState.selectedModels.includes(
												model.id,
											);
											const isDisabled =
												!isSelected && gameState.selectedModels.length >= 6;
											return (
												<button
													type="button"
													key={model.id}
													onClick={() => !isDisabled && toggleModel(model.id)}
													disabled={isDisabled}
													className={cn(
														"group relative p-4 rounded-lg text-left transition-all border",
														isSelected
															? "bg-primary text-primary-foreground border-primary"
															: isDisabled
																? "opacity-30 cursor-not-allowed border-border"
																: "hover:bg-muted border-border hover:border-primary/50",
													)}
												>
													<div className="flex items-center gap-2">
														<span
															className={cn(
																"size-3 rounded-full shrink-0",
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
														{model.provider}
													</div>
													{isSelected && (
														<div className="absolute top-2 right-2">
															<Check className="size-4" />
														</div>
													)}
												</button>
											);
										})}
									</div>
								</CardContent>
							</Card>

							<div className="flex justify-center gap-4">
								<Button variant="outline" onClick={shuffleSelection}>
									<Shuffle className="size-4" />
									Random
								</Button>
								<Button
									size="lg"
									onClick={startGame}
									disabled={gameState.selectedModels.length < 2}
								>
									<Pencil className="size-4" />
									{gameState.selectedModels.length < 2
										? "Select 2+ models"
										: "Start Drawing"}
								</Button>
							</div>
						</div>
					)}

					{/* Drawing Phase */}
					{gameState.status === "drawing" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<Badge variant="secondary" className="text-lg px-6 py-2">
									Draw: &ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<p className="text-muted-foreground">
									Draw the concept below, then submit for AI to guess
								</p>
							</div>

							<div className="flex flex-col items-center gap-6">
								<DrawingCanvas
									onDrawingChange={setDrawingDataUrl}
									width={400}
									height={400}
									className="max-w-md w-full"
								/>

								<div className="flex gap-4">
									<Button
										variant="outline"
										onClick={() =>
											setGameState((prev) => ({ ...prev, status: "setup" }))
										}
									>
										Change Models
									</Button>
									<Button
										size="lg"
										onClick={submitDrawing}
										disabled={!drawingDataUrl}
									>
										<Send className="size-4" />
										Submit for Guessing
									</Button>
								</div>
							</div>

							{/* Selected Models */}
							<div className="flex justify-center gap-2 flex-wrap">
								{gameState.selectedModels.map((modelId) => {
									const model = getModelById(modelId);
									if (!model) return null;
									return (
										<Badge key={modelId} variant="outline" className="gap-2">
											<span
												className="size-2 rounded-full"
												style={{ backgroundColor: model.color }}
											/>
											{model.name}
										</Badge>
									);
								})}
							</div>
						</div>
					)}

					{/* Guessing Phase */}
					{gameState.status === "guessing" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<Badge variant="secondary" className="text-lg px-6 py-2">
									&ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
									<div className="flex items-center gap-2">
										<Clock className="size-4" />
										<span className="tabular-nums font-mono">
											{elapsedTime}s
										</span>
									</div>
									<div className="h-4 w-px bg-border" />
									<span>
										{guessingModels.filter((m) => m.status === "done").length}/
										{guessingModels.length} guessed
									</span>
								</div>
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								{/* Drawing Preview */}
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

								{/* Guesses */}
								<div className="space-y-3">
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
											<CardContent className="p-4">
												<div className="flex items-center gap-3">
													<div
														className={cn(
															"size-3 rounded-full shrink-0",
															model.status === "guessing" && "animate-pulse",
														)}
														style={{ backgroundColor: model.color }}
													/>
													<span className="font-medium flex-1">
														{model.name}
													</span>
													{model.status === "pending" && (
														<Spinner className="size-4" />
													)}
													{model.status === "guessing" && (
														<Spinner className="size-4" />
													)}
													{model.status === "done" && model.timeMs && (
														<Badge
															variant="outline"
															className="text-xs tabular-nums"
														>
															{(model.timeMs / 1000).toFixed(1)}s
														</Badge>
													)}
													{model.status === "done" && model.isCorrect && (
														<Check className="size-4 text-green-500" />
													)}
												</div>
												{(model.status === "guessing" ||
													model.status === "done") &&
													model.guess && (
														<div
															className={cn(
																"mt-2 text-lg font-medium",
																model.status === "done" &&
																	model.isCorrect &&
																	"text-green-500",
															)}
														>
															&ldquo;{model.guess}&rdquo;
														</div>
													)}
												{model.status === "error" && (
													<div className="mt-2 text-sm text-red-500">
														Failed to guess
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
							<div className="text-center space-y-4">
								<Badge variant="secondary" className="text-lg px-6 py-2">
									Answer: &ldquo;{gameState.prompt}&rdquo;
								</Badge>
								<h2 className="text-2xl font-light">
									{gameState.guesses.some((g) => g.isCorrect)
										? "Someone got it!"
										: "No one guessed it!"}
								</h2>
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								{/* Drawing */}
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

								{/* Results */}
								<div className="space-y-3">
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
													isWinner && "ring-2 ring-yellow-500 bg-yellow-500/5",
													guess?.isCorrect &&
														!isWinner &&
														"ring-2 ring-green-500/50",
													model.status === "error" && "opacity-50",
												)}
											>
												<CardContent className="p-4">
													<div className="flex items-center gap-3">
														<div
															className="size-3 rounded-full shrink-0"
															style={{ backgroundColor: model.color }}
														/>
														<span className="font-medium flex-1">
															{model.name}
														</span>
														{isWinner && (
															<Badge className="bg-yellow-500 text-yellow-950">
																<Trophy className="size-3" />
																Winner
															</Badge>
														)}
														{guess?.isCorrect && !isWinner && (
															<Badge
																variant="outline"
																className="text-green-500 border-green-500"
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
																"mt-2 text-lg",
																guess.isCorrect
																	? "text-green-500 font-medium"
																	: "text-muted-foreground",
															)}
														>
															&ldquo;{guess.guess}&rdquo;
														</div>
													)}
													{model.status === "error" && (
														<div className="mt-2 text-sm text-red-500">
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
							{Object.keys(gameState.leaderboard).length > 0 && (
								<Card>
									<CardContent className="p-6">
										<div className="flex items-center gap-3 mb-4">
											<Trophy className="size-5 text-yellow-500" />
											<h3 className="text-lg font-medium">Leaderboard</h3>
											<span className="text-sm text-muted-foreground ml-auto">
												{gameState.roundsPlayed} rounds
											</span>
										</div>
										<div className="space-y-3">
											{Object.entries(gameState.leaderboard)
												.sort(([, a], [, b]) => b - a)
												.map(([modelId, wins], index) => {
													const model = getModelById(modelId);
													if (!model) return null;
													return (
														<div
															key={modelId}
															className="flex items-center gap-3"
														>
															<span
																className={cn(
																	"w-6 text-center font-mono text-sm",
																	index === 0 && "text-yellow-500 font-bold",
																)}
															>
																{index + 1}
															</span>
															<div
																className="size-3 rounded-full"
																style={{ backgroundColor: model.color }}
															/>
															<span className="flex-1">{model.name}</span>
															<span className="text-muted-foreground">
																{wins} win{wins !== 1 ? "s" : ""}
															</span>
														</div>
													);
												})}
										</div>
									</CardContent>
								</Card>
							)}

							<div className="flex justify-center gap-4">
								<Button
									variant="outline"
									onClick={() =>
										setGameState((prev) => ({ ...prev, status: "setup" }))
									}
								>
									Change Models
								</Button>
								<Button
									variant="outline"
									onClick={() => window.location.reload()}
								>
									<RotateCcw className="size-4" />
									Reset
								</Button>
								<Button size="lg" onClick={playAgain}>
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
