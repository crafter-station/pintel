"use client";

import {
	Check,
	Clock,
	Dices,
	DollarSign,
	Eye,
	FastForward,
	Pause,
	Pencil,
	Play,
	RotateCcw,
	Trophy,
	X,
	Zap,
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
	DEFAULT_VISION_MODELS,
	formatCost,
	getModelById,
	getVisionModels,
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface DuelState {
	status: "idle" | "running" | "paused" | "round-end" | "finished";
	currentRound: number;
	totalRounds: number;
	currentDrawer: string | null;
	currentPrompt: string;
	currentSvg: string | null;
	guesses: Record<string, { guess: string; isCorrect: boolean; timeMs: number }>;
	leaderboard: Record<string, { draws: number; correctGuesses: number; points: number }>;
	totalCost: number;
	totalTokens: number;
	roundHistory: RoundResult[];
	autoPlay: boolean;
}

interface RoundResult {
	drawer: string;
	prompt: string;
	svg: string;
	guesses: Record<string, { guess: string; isCorrect: boolean }>;
	winner: string | null;
}

const PHASE_TIMEOUT = 45;

export default function AIDuelPage() {
	const saveSession = useSaveSession();
	const { isAuthenticated } = useUserIdentity();
	const [showSignupPrompt, setShowSignupPrompt] = useState(false);
	const [selectedModelIds, setSelectedModelIds] = useState<string[]>(DEFAULT_VISION_MODELS);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const [state, setState] = useState<DuelState>({
		status: "idle",
		currentRound: 0,
		totalRounds: 8,
		currentDrawer: null,
		currentPrompt: "",
		currentSvg: null,
		guesses: {},
		leaderboard: {},
		totalCost: 0,
		totalTokens: 0,
		roundHistory: [],
		autoPlay: true,
	});

	const [phaseStatus, setPhaseStatus] = useState<"idle" | "drawing" | "guessing" | "scoring">("idle");
	const [elapsedTime, setElapsedTime] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const visionModels = useMemo(() => getVisionModels(), []);

	const isGameActive = state.status === "running" || state.status === "round-end" || state.status === "paused";

	const timeRemaining = PHASE_TIMEOUT - elapsedTime;
	const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
	const isCritical = timeRemaining <= 5 && timeRemaining > 0;

	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
			if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
		};
	}, []);

	useEffect(() => {
		if (phaseStatus !== "idle") {
			startTimeRef.current = Date.now();
			const interval = setInterval(() => {
				if (startTimeRef.current) {
					const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
					setElapsedTime(elapsed);

					if (elapsed >= PHASE_TIMEOUT) {
						abortControllerRef.current?.abort();
					}
				}
			}, 1000);
			return () => clearInterval(interval);
		}
		setElapsedTime(0);
		startTimeRef.current = null;
	}, [phaseStatus]);

	const handleRandomModels = useCallback(() => {
		const shuffled = shuffleModels(visionModels, 4);
		setSelectedModelIds(shuffled.map((m) => m.id));
	}, [visionModels]);

	const svgToPng = useCallback((svgString: string): Promise<string> => {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement("canvas");
			canvas.width = 400;
			canvas.height = 400;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			const img = new Image();
			const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
			const url = URL.createObjectURL(svgBlob);

			img.onload = () => {
				ctx.fillStyle = "white";
				ctx.fillRect(0, 0, 400, 400);
				ctx.drawImage(img, 0, 0, 400, 400);
				URL.revokeObjectURL(url);
				resolve(canvas.toDataURL("image/png"));
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Failed to load SVG"));
			};

			img.src = url;
		});
	}, []);

	const togglePause = useCallback(() => {
		if (autoPlayRef.current) {
			clearTimeout(autoPlayRef.current);
			autoPlayRef.current = null;
		}
		setState((prev) => ({ ...prev, autoPlay: !prev.autoPlay }));
	}, []);

	const checkGuess = useCallback((guess: string, prompt: string): boolean => {
		const normalizedGuess = guess.toLowerCase().trim();
		const normalizedPrompt = prompt.toLowerCase().trim();
		if (normalizedGuess.includes(normalizedPrompt) || normalizedPrompt.includes(normalizedGuess)) {
			return true;
		}
		const promptWords = normalizedPrompt.split(/\s+/);
		const guessWords = normalizedGuess.split(/\s+/);
		const significantWords = promptWords.filter((w) => w.length > 2);
		return significantWords.some((word) =>
			guessWords.some((gw) => gw.includes(word) || word.includes(gw)),
		);
	}, []);

	const runRound = useCallback(
		async (
			drawerId: string,
			models: string[],
			leaderboard: DuelState["leaderboard"],
			roundNum: number,
		) => {
			abortControllerRef.current?.abort();
			abortControllerRef.current = new AbortController();

			const prompt = getRandomPrompt();
			const guessers = models.filter((id) => id !== drawerId);

			setState((prev) => ({
				...prev,
				currentDrawer: drawerId,
				currentPrompt: prompt,
				currentSvg: null,
				guesses: {},
			}));

			setPhaseStatus("drawing");

			try {
				const drawResponse = await fetch("/api/generate-drawings", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ prompt, models: [drawerId] }),
					signal: abortControllerRef.current.signal,
				});

				if (!drawResponse.ok) throw new Error("Drawing failed");

				const reader = drawResponse.body?.getReader();
				if (!reader) throw new Error("No response body");

				const decoder = new TextDecoder();
				let buffer = "";
				let finalSvg = "";
				let drawCost = 0;
				let drawTokens = 0;
				const drawChunks: string[] = [];

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						try {
							const event = JSON.parse(line.slice(6));
							if (event.type === "partial" && event.svg) {
								drawChunks.push(event.svg);
								setState((prev) => ({ ...prev, currentSvg: event.svg }));
							} else if (event.type === "drawing") {
								finalSvg = event.svg;
								drawCost = event.cost || 0;
								drawTokens = event.usage?.totalTokens || 0;
								setState((prev) => ({ ...prev, currentSvg: event.svg }));
							}
						} catch {}
					}
				}

				if (!finalSvg) throw new Error("No SVG generated");

				const newLeaderboard = { ...leaderboard };
				newLeaderboard[drawerId].draws += 1;

				setState((prev) => ({
					...prev,
					leaderboard: newLeaderboard,
					totalCost: prev.totalCost + drawCost,
					totalTokens: prev.totalTokens + drawTokens,
				}));

				setPhaseStatus("guessing");

				const pngDataUrl = await svgToPng(finalSvg);

				const guessResponse = await fetch("/api/guess-drawing", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ imageDataUrl: pngDataUrl, models: guessers }),
					signal: abortControllerRef.current.signal,
				});

				if (!guessResponse.ok) throw new Error("Guessing failed");

				const guessReader = guessResponse.body?.getReader();
				if (!guessReader) throw new Error("No response body");

				let guessBuffer = "";
				const roundGuesses: Record<string, { guess: string; isCorrect: boolean; timeMs: number; cost?: number; tokens?: number }> = {};
				let guessCost = 0;
				let guessTokens = 0;

				while (true) {
					const { done, value } = await guessReader.read();
					if (done) break;

					guessBuffer += decoder.decode(value, { stream: true });
					const lines = guessBuffer.split("\n\n");
					guessBuffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						try {
							const event = JSON.parse(line.slice(6));

							if (event.type === "partial") {
								setState((prev) => ({
									...prev,
									guesses: {
										...prev.guesses,
										[event.modelId]: { guess: event.guess, isCorrect: false, timeMs: 0 },
									},
								}));
							} else if (event.type === "guess") {
								const isCorrect = checkGuess(event.guess, prompt);
								roundGuesses[event.modelId] = {
									guess: event.guess,
									isCorrect,
									timeMs: event.generationTimeMs,
									cost: event.cost,
									tokens: event.usage?.totalTokens,
								};
								setState((prev) => ({
									...prev,
									guesses: {
										...prev.guesses,
										[event.modelId]: { guess: event.guess, isCorrect, timeMs: event.generationTimeMs },
									},
								}));
							} else if (event.type === "complete") {
								guessCost = event.totalCost || 0;
								guessTokens = event.totalTokens || 0;
							}
						} catch {}
					}
				}

				setPhaseStatus("scoring");

				const correctGuessers = Object.entries(roundGuesses)
					.filter(([, g]) => g.isCorrect)
					.sort(([, a], [, b]) => a.timeMs - b.timeMs);

				const winner = correctGuessers.length > 0 ? correctGuessers[0][0] : null;

				const finalLeaderboard = { ...newLeaderboard };
				correctGuessers.forEach(([modelId], index) => {
					finalLeaderboard[modelId].correctGuesses += 1;
					finalLeaderboard[modelId].points += index === 0 ? 3 : 1;
				});
				if (!winner) {
					finalLeaderboard[drawerId].points += 1;
				}

				const roundResult: RoundResult = {
					drawer: drawerId,
					prompt,
					svg: finalSvg,
					guesses: Object.fromEntries(
						Object.entries(roundGuesses).map(([k, v]) => [k, { guess: v.guess, isCorrect: v.isCorrect }]),
					),
					winner,
				};

				saveSession.mutate({
					mode: "ai_duel",
					prompt,
					totalCost: drawCost + guessCost,
					totalTokens: drawTokens + guessTokens,
					totalTimeMs: (drawTokens + guessTokens) * 10,
					drawings: [
						{
							modelId: drawerId,
							svg: finalSvg,
							generationTimeMs: drawTokens * 10,
							cost: drawCost,
							tokens: drawTokens,
							isWinner: !winner,
							chunks: drawChunks,
						},
					],
					guesses: Object.entries(roundGuesses).map(([modelId, g]) => ({
						modelId,
						guess: g.guess,
						isCorrect: g.isCorrect,
						generationTimeMs: g.timeMs,
						cost: g.cost,
						tokens: g.tokens,
					})),
				});

				setState((prev) => {
					const isFinished = roundNum >= prev.totalRounds;
					if (isFinished && !isAuthenticated) {
						setTimeout(() => setShowSignupPrompt(true), 1000);
					}
					return {
						...prev,
						leaderboard: finalLeaderboard,
						totalCost: prev.totalCost + guessCost,
						totalTokens: prev.totalTokens + guessTokens,
						roundHistory: [...prev.roundHistory, roundResult],
						status: isFinished ? "finished" : "round-end",
					};
				});

				setPhaseStatus("idle");

				setState((prev) => {
					if (roundNum < prev.totalRounds && prev.autoPlay) {
						autoPlayRef.current = setTimeout(() => {
							const nextDrawerIndex = (models.indexOf(drawerId) + 1) % models.length;
							const nextDrawer = models[nextDrawerIndex];
							setState((s) => ({ ...s, currentRound: roundNum + 1, status: "running" }));
							runRound(nextDrawer, models, finalLeaderboard, roundNum + 1);
						}, 2000);
					}
					return prev;
				});
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				console.error("Round error:", error);
				setPhaseStatus("idle");
				setState((prev) => ({ ...prev, status: "paused" }));
			}
		},
		[svgToPng, saveSession, checkGuess, isAuthenticated],
	);

	const startDuel = useCallback(() => {
		if (selectedModelIds.length < 3) return;

		const initialLeaderboard: DuelState["leaderboard"] = {};
		selectedModelIds.forEach((id) => {
			initialLeaderboard[id] = { draws: 0, correctGuesses: 0, points: 0 };
		});

		setState((prev) => ({
			...prev,
			status: "running",
			currentRound: 1,
			leaderboard: initialLeaderboard,
			roundHistory: [],
			totalCost: 0,
			totalTokens: 0,
			autoPlay: true,
		}));

		runRound(selectedModelIds[0], selectedModelIds, initialLeaderboard, 1);
	}, [selectedModelIds, runRound]);

	const continueToNextRound = useCallback(() => {
		const nextDrawerIndex = (selectedModelIds.indexOf(state.currentDrawer!) + 1) % selectedModelIds.length;
		const nextDrawer = selectedModelIds[nextDrawerIndex];
		setState((prev) => ({ ...prev, currentRound: prev.currentRound + 1, status: "running" }));
		runRound(nextDrawer, selectedModelIds, state.leaderboard, state.currentRound + 1);
	}, [selectedModelIds, state.currentDrawer, state.leaderboard, state.currentRound, runRound]);

	const resetGame = useCallback(() => {
		abortControllerRef.current?.abort();
		if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
		setState({
			status: "idle",
			currentRound: 0,
			totalRounds: 8,
			currentDrawer: null,
			currentPrompt: "",
			currentSvg: null,
			guesses: {},
			leaderboard: {},
			totalCost: 0,
			totalTokens: 0,
			roundHistory: [],
			autoPlay: true,
		});
		setPhaseStatus("idle");
	}, []);

	const sortedLeaderboard = useMemo(() => {
		return Object.entries(state.leaderboard)
			.map(([modelId, stats]) => ({ modelId, ...stats }))
			.sort((a, b) => b.points - a.points);
	}, [state.leaderboard]);

	const gridCols = useMemo(() => {
		const count = selectedModelIds.length;
		if (count <= 2) return "grid-cols-2";
		if (count <= 4) return "grid-cols-2 md:grid-cols-4";
		return "grid-cols-2 md:grid-cols-3";
	}, [selectedModelIds.length]);

	return (
		<TooltipProvider>
			<div className="space-y-6">
				{/* Header */}
				<header className="flex flex-col sm:flex-row sm:items-center gap-3">
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
								<span className="text-xs font-medium hidden sm:inline">Random</span>
							</Button>
						</ButtonGroup>
					</div>

					<div className="flex items-center gap-2 ml-auto">
						{state.totalCost > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="outline" className="cursor-help gap-1">
										<DollarSign className="size-3" />
										{formatCost(state.totalCost)}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Total session cost</p>
									<p className="text-xs text-muted-foreground">
										{state.totalTokens.toLocaleString()} tokens
									</p>
								</TooltipContent>
							</Tooltip>
						)}
						<Badge variant="secondary" className="gap-1">
							<Trophy className="size-3" />
							{state.currentRound}/{state.totalRounds}
						</Badge>
						{state.status === "idle" && (
							<Button
								onClick={startDuel}
								disabled={selectedModelIds.length < 3}
								className="gap-1.5"
							>
								<Zap className="size-4" />
								{selectedModelIds.length < 3 ? "Select 3+" : "Start Duel"}
							</Button>
						)}
					</div>
				</header>

				{/* Idle State */}
				{state.status === "idle" && (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<h2 className="text-xl font-medium">AI Arena</h2>
							<p className="text-sm text-muted-foreground">
								{selectedModelIds.length} AI models will take turns drawing and guessing
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
												<span className="text-sm font-medium truncate">{model.name}</span>
											</div>
											<div className="text-xs text-muted-foreground mt-1">{model.provider}</div>
										</div>
									</Card>
								);
							})}
						</div>

						{selectedModelIds.length >= 3 && (
							<div className="text-center pt-2">
								<p className="text-sm text-muted-foreground mb-3">
									Click <span className="font-medium text-foreground">Start Duel</span> to begin!
								</p>
							</div>
						)}

						{selectedModelIds.length < 3 && (
							<div className="text-center py-8">
								<p className="text-muted-foreground">Select at least 3 models to start a duel</p>
							</div>
						)}
					</div>
				)}

				{/* Running / Round End */}
				{(state.status === "running" || state.status === "round-end" || state.status === "paused") && (
					<div className="space-y-4">
						<div className="text-center space-y-2">
							<div className="flex items-center justify-center gap-2 flex-wrap">
								<Badge variant="secondary" className="text-sm sm:text-base px-3 sm:px-4 py-1">
									Round {state.currentRound}/{state.totalRounds}
								</Badge>
								{phaseStatus !== "idle" && (
									<Badge
										variant="outline"
										className={cn(
											"tabular-nums font-mono transition-colors",
											isCritical && "border-red-500 text-red-500 animate-pulse",
											isUrgent && !isCritical && "border-yellow-500 text-yellow-500",
										)}
									>
										<Clock className={cn("size-3 mr-1", isCritical && "animate-spin")} />
										{timeRemaining > 0 ? `${timeRemaining}s` : "Time's up!"}
									</Badge>
								)}
								<Button
									variant={state.autoPlay ? "outline" : "default"}
									size="sm"
									onClick={togglePause}
									className="h-7"
								>
									{state.autoPlay ? (
										<><Pause className="size-3 mr-1" />Pause</>
									) : (
										<><Play className="size-3 mr-1" />Auto</>
									)}
								</Button>
							</div>

							<div className="text-sm sm:text-base">
								{phaseStatus === "drawing" && (
									<span className="text-blue-500">
										<Pencil className="size-4 inline mr-1.5" />
										{getModelById(state.currentDrawer!)?.name} is drawing...
									</span>
								)}
								{phaseStatus === "guessing" && (
									<span className="text-purple-500">
										<Eye className="size-4 inline mr-1.5" />
										Models are guessing...
									</span>
								)}
								{phaseStatus === "scoring" && (
									<span className="text-yellow-500">
										<Trophy className="size-4 inline mr-1.5" />
										Scoring...
									</span>
								)}
								{state.status === "round-end" && (
									<span className="text-green-500">Round Complete!</span>
								)}
							</div>

							{state.currentPrompt && (
								<Badge variant="outline" className="text-sm px-3 py-1">
									&ldquo;{state.currentPrompt}&rdquo;
								</Badge>
							)}
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							{/* Drawing */}
							<Card className="overflow-hidden">
								<div className="p-2.5 border-b bg-muted/30 flex items-center gap-2">
									<Pencil className="size-3.5" />
									<span className="text-sm font-medium">Drawing</span>
									{state.currentDrawer && (
										<Badge variant="outline" className="ml-auto text-xs">
											{getModelById(state.currentDrawer)?.name}
										</Badge>
									)}
								</div>
								<div className="aspect-square bg-white flex items-center justify-center">
									{state.currentSvg ? (
										<div
											className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
											dangerouslySetInnerHTML={{ __html: state.currentSvg }}
										/>
									) : (
										<Spinner className="size-8" />
									)}
								</div>
							</Card>

							{/* Guesses */}
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
									<Eye className="size-3.5" />
									<span>Guesses</span>
									<span className="ml-auto tabular-nums">
										{Object.keys(state.guesses).length}/{selectedModelIds.length - 1}
									</span>
								</div>
								{selectedModelIds
									.filter((id) => id !== state.currentDrawer)
									.map((modelId) => {
										const model = getModelById(modelId);
										const guess = state.guesses[modelId];
										if (!model) return null;

										return (
											<Card
												key={modelId}
												className={cn(
													"transition-all",
													guess?.isCorrect && "ring-2 ring-green-500 bg-green-500/5",
													!guess && phaseStatus === "guessing" && "opacity-60",
												)}
											>
												<CardContent className="p-3">
													<div className="flex items-center gap-2">
														<div
															className={cn(
																"size-2.5 rounded-full shrink-0",
																!guess && phaseStatus === "guessing" && "animate-pulse",
															)}
															style={{ backgroundColor: model.color }}
														/>
														<span className="text-sm font-medium truncate">{model.name}</span>
														<div className="flex-1" />
														{!guess && phaseStatus === "guessing" && (
															<Badge variant="outline" className="text-[10px]">
																<Spinner className="size-2.5 mr-1" />
																thinking
															</Badge>
														)}
														{guess?.isCorrect && (
															<Badge className="bg-green-500 text-white text-[10px]">
																<Check className="size-3" />
																Correct
															</Badge>
														)}
														{guess && !guess.isCorrect && state.status === "round-end" && (
															<X className="size-4 text-red-500" />
														)}
														{guess?.timeMs && (
															<span className="text-[10px] text-muted-foreground tabular-nums">
																{(guess.timeMs / 1000).toFixed(1)}s
															</span>
														)}
													</div>
													{guess?.guess && (
														<div
															className={cn(
																"mt-1.5 text-sm font-medium truncate",
																guess.isCorrect && "text-green-500",
															)}
														>
															&ldquo;{guess.guess}&rdquo;
														</div>
													)}
													{!guess && (
														<div className="mt-1.5 text-xs text-muted-foreground">
															Waiting...
														</div>
													)}
												</CardContent>
											</Card>
										);
									})}
							</div>
						</div>

						{/* Leaderboard */}
						<Card>
							<div className="p-2.5 sm:p-3 border-b bg-muted/30 flex items-center gap-2">
								<Trophy className="size-3.5 text-yellow-500" />
								<span className="text-sm font-medium">Leaderboard</span>
							</div>
							<CardContent className="p-2.5 sm:p-3">
								<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
									{sortedLeaderboard.map((entry, index) => {
										const model = getModelById(entry.modelId);
										if (!model) return null;
										return (
											<div
												key={entry.modelId}
												className={cn(
													"p-2.5 rounded-lg border",
													index === 0 && entry.points > 0 && "bg-yellow-500/10 border-yellow-500/50",
												)}
											>
												<div className="flex items-center gap-1.5 mb-1">
													<span className="text-[10px] text-muted-foreground">#{index + 1}</span>
													<div className="size-2 rounded-full" style={{ backgroundColor: model.color }} />
													<span className="text-xs font-medium truncate">{model.name}</span>
												</div>
												<div className="text-xl font-bold">{entry.points}</div>
												<div className="text-[10px] text-muted-foreground">{entry.correctGuesses} correct</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>

						{/* Controls */}
						{state.status === "round-end" && state.currentRound < state.totalRounds && !state.autoPlay && (
							<div className="flex justify-center gap-2">
								<Button variant="outline" size="sm" onClick={togglePause}>
									<Play className="size-4" />
									<span className="hidden sm:inline">Enable Auto</span>
								</Button>
								<Button size="sm" onClick={continueToNextRound}>
									<FastForward className="size-4" />
									Next Round
								</Button>
							</div>
						)}
						{state.status === "round-end" && state.currentRound < state.totalRounds && state.autoPlay && (
							<div className="flex justify-center">
								<Badge variant="outline" className="animate-pulse px-3 py-1.5">
									<Clock className="size-3.5 mr-1.5" />
									Next round starting...
								</Badge>
							</div>
						)}
					</div>
				)}

				{/* Finished */}
				{state.status === "finished" && (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<Trophy className="size-12 mx-auto text-yellow-500" />
							<h2 className="text-xl sm:text-2xl font-light">Duel Complete!</h2>
							<p className="text-sm text-muted-foreground">{state.totalRounds} rounds played</p>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-center gap-2 sm:gap-3">
							<Button variant="outline" onClick={resetGame} size="sm" className="flex-1 sm:flex-none sm:px-6">
								<RotateCcw className="size-4" />
								<span className="hidden sm:inline">Reset</span>
							</Button>
							<Button onClick={startDuel} size="sm" className="flex-1 sm:flex-none sm:px-8">
								<Play className="size-4" />
								Play Again
							</Button>
						</div>

						{/* Winner */}
						{sortedLeaderboard[0] && (
							<Card className="bg-yellow-500/10 border-yellow-500/50">
								<CardContent className="p-4 sm:p-6 text-center">
									<div
										className="size-8 rounded-full mx-auto mb-2"
										style={{ backgroundColor: getModelById(sortedLeaderboard[0].modelId)?.color }}
									/>
									<h3 className="text-xl font-bold">{getModelById(sortedLeaderboard[0].modelId)?.name}</h3>
									<p className="text-yellow-600 text-sm">Champion with {sortedLeaderboard[0].points} points</p>
								</CardContent>
							</Card>
						)}

						{/* Final Leaderboard */}
						<Card>
							<div className="p-3 sm:p-4 border-b bg-muted/30 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Trophy className="size-4 text-yellow-500" />
									<h3 className="font-medium text-sm sm:text-base">Final Standings</h3>
								</div>
								<span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
									{state.totalRounds} rounds
								</span>
							</div>
							<CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
								{sortedLeaderboard.map((entry, index) => {
									const model = getModelById(entry.modelId);
									if (!model) return null;
									const maxPoints = sortedLeaderboard[0]?.points || 1;
									const percentage = (entry.points / maxPoints) * 100;
									const isLeader = index === 0 && entry.points > 0;

									return (
										<div key={entry.modelId} className="space-y-1.5">
											<div className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-2">
													<span
														className={cn(
															"w-5 text-center font-mono text-xs",
															isLeader ? "text-yellow-500 font-bold" : "text-muted-foreground",
														)}
													>
														{index + 1}
													</span>
													<div className="size-2.5 rounded-full" style={{ backgroundColor: model.color }} />
													<span className={cn("font-medium", isLeader && "text-yellow-600 dark:text-yellow-400")}>
														{model.name}
													</span>
													{isLeader && <Trophy className="size-3.5 text-yellow-500" />}
												</div>
												<span className="text-muted-foreground tabular-nums text-xs">
													{entry.points} pts ({entry.correctGuesses} correct)
												</span>
											</div>
											<Progress value={percentage} className={cn("h-1.5", isLeader && "[&>div]:bg-yellow-500")} />
										</div>
									);
								})}
							</CardContent>
						</Card>

						{/* Stats */}
						<div className="flex justify-center gap-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-1.5">
								<DollarSign className="size-3.5" />
								<span>{formatCost(state.totalCost)}</span>
							</div>
							<div className="flex items-center gap-1.5">
								<Zap className="size-3.5" />
								<span>{state.totalTokens.toLocaleString()} tokens</span>
							</div>
						</div>
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

			<SignupPrompt open={showSignupPrompt} onOpenChange={setShowSignupPrompt} />
		</TooltipProvider>
	);
}
