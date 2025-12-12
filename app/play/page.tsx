"use client";

import {
	ArrowLeft,
	Bot,
	Check,
	Clock,
	DollarSign,
	Play,
	RotateCcw,
	Send,
	Shuffle,
	Trophy,
	User,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useCreateSession,
	useSaveRound,
	useSaveSession,
} from "@/lib/hooks/use-gallery";
import {
	DEFAULT_VISION_MODELS,
	formatCost,
	getModelById,
	getVisionModels,
	shuffleModels,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

type Participant = {
	id: string;
	name: string;
	type: "human" | "llm";
	color: string;
	score: number;
	drawingScore: number;
	guessingScore: number;
};

type GuessResult = {
	participantId: string;
	guess: string;
	semanticScore: number;
	timeBonus: number;
	finalScore: number;
	timeMs: number;
};

type RoundResult = {
	drawerId: string;
	drawerType: "human" | "llm";
	prompt: string;
	svg?: string;
	imageDataUrl?: string;
	guesses: GuessResult[];
	maxPossibleScore?: number;
	topScore?: number;
};

type GameState = {
	status: "setup" | "drawing" | "guessing" | "round-results" | "game-over";
	sessionId: string | null;
	participants: Participant[];
	currentRound: number;
	totalRounds: number;
	currentDrawerIndex: number;
	currentPrompt: string;
	currentDrawing: string | null;
	roundHistory: RoundResult[];
	totalCost: number;
	totalTokens: number;
	drawingTimeLimit: number;
};

const HUMAN_PARTICIPANT: Participant = {
	id: "human",
	name: "You",
	type: "human",
	color: "#10b981",
	score: 0,
	drawingScore: 0,
	guessingScore: 0,
};

export default function PictionaryPage() {
	const [gameState, setGameState] = useState<GameState>({
		status: "setup",
		sessionId: null,
		participants: [HUMAN_PARTICIPANT],
		currentRound: 0,
		totalRounds: 4,
		currentDrawerIndex: 0,
		currentPrompt: "",
		currentDrawing: null,
		roundHistory: [],
		totalCost: 0,
		totalTokens: 0,
		drawingTimeLimit: 60,
	});

	const [selectedModels, setSelectedModels] = useState<string[]>(
		DEFAULT_VISION_MODELS.slice(0, 3),
	);
	const [drawingDataUrl, setDrawingDataUrl] = useState<string>("");
	const [humanGuess, setHumanGuess] = useState("");
	const [timeRemaining, setTimeRemaining] = useState(60);
	const [llmGuesses, setLlmGuesses] = useState<Record<string, GuessResult>>({});
	const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
	const [humanGuessSubmitted, setHumanGuessSubmitted] = useState(false);
	const [llmDrawingSvg, setLlmDrawingSvg] = useState<string | null>(null);
	const [isGeneratingDrawing, setIsGeneratingDrawing] = useState(false);

	const saveSession = useSaveSession();
	const saveRound = useSaveRound();
	const createSession = useCreateSession();
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const guessStartTimeRef = useRef<number>(0);
	const autoTransitionTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [autoTransitionCountdown, setAutoTransitionCountdown] = useState<
		number | null
	>(null);
	const finishGuessingCalledRef = useRef(false);
	const finishGuessingRef = useRef<() => void>(() => {});
	const handleDrawingCompleteRef = useRef<() => void>(() => {});
	const nextRoundRef = useRef<() => void>(() => {});

	const visionModels = useMemo(() => getVisionModels(), []);

	const currentDrawer = useMemo(() => {
		return gameState.participants[gameState.currentDrawerIndex];
	}, [gameState.participants, gameState.currentDrawerIndex]);

	const isHumanDrawing = currentDrawer?.type === "human";

	useEffect(() => {
		if (gameState.status === "drawing" || gameState.status === "guessing") {
			setTimeRemaining(gameState.drawingTimeLimit);
			timerRef.current = setInterval(() => {
				setTimeRemaining((prev) => {
					if (prev <= 1) {
						if (timerRef.current) clearInterval(timerRef.current);
						if (gameState.status === "drawing") {
							handleDrawingComplete();
						} else if (gameState.status === "guessing") {
							finishGuessing();
						}
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			return () => {
				if (timerRef.current) clearInterval(timerRef.current);
			};
		}
	}, [gameState.status, gameState.currentRound]);

	const toggleModel = useCallback((modelId: string) => {
		setSelectedModels((prev) =>
			prev.includes(modelId)
				? prev.filter((id) => id !== modelId)
				: prev.length < 5
					? [...prev, modelId]
					: prev,
		);
	}, []);

	const shuffleSelection = useCallback(() => {
		const shuffled = shuffleModels(visionModels, 3);
		setSelectedModels(shuffled.map((m) => m.id));
	}, [visionModels]);

	const startGame = useCallback(async () => {
		if (selectedModels.length < 1) return;

		const llmParticipants: Participant[] = selectedModels.map((modelId) => {
			const model = getModelById(modelId);
			return {
				id: modelId,
				name: model?.name || modelId,
				type: "llm",
				color: model?.color || "#888",
				score: 0,
				drawingScore: 0,
				guessingScore: 0,
			};
		});

		const allParticipants = [HUMAN_PARTICIPANT, ...llmParticipants];
		const prompt = getRandomPrompt();
		const totalRounds = allParticipants.length * 2;

		let sessionId: string | null = null;
		try {
			const response = await createSession.mutateAsync({
				mode: "pictionary",
				prompt,
				totalRounds,
				participants: allParticipants.map((p) => p.id),
			});
			sessionId = response.sessionId;
		} catch (error) {
			console.error("Failed to create session:", error);
		}

		setGameState({
			status: "drawing",
			sessionId,
			participants: allParticipants,
			currentRound: 1,
			totalRounds,
			currentDrawerIndex: 0,
			currentPrompt: prompt,
			currentDrawing: null,
			roundHistory: [],
			totalCost: 0,
			totalTokens: 0,
			drawingTimeLimit: 60,
		});
		setDrawingDataUrl("");
		setLlmDrawingSvg(null);
		setHumanGuess("");
		setLlmGuesses({});
		setHumanGuessSubmitted(false);
	}, [selectedModels, createSession]);

	const handleDrawingComplete = useCallback(async () => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (autoTransitionTimerRef.current)
			clearInterval(autoTransitionTimerRef.current);

		if (isHumanDrawing && !drawingDataUrl) {
			return;
		}

		finishGuessingCalledRef.current = false;
		setAutoTransitionCountdown(null);

		setGameState((prev) => ({
			...prev,
			status: "guessing",
			currentDrawing: isHumanDrawing ? drawingDataUrl : llmDrawingSvg,
		}));

		guessStartTimeRef.current = Date.now();
		setTimeRemaining(gameState.drawingTimeLimit);

		if (!isHumanDrawing) {
			triggerLlmGuesses(llmDrawingSvg!);
		} else {
			triggerLlmGuesses(drawingDataUrl);
		}
	}, [
		isHumanDrawing,
		drawingDataUrl,
		llmDrawingSvg,
		gameState.drawingTimeLimit,
	]);

	useEffect(() => {
		handleDrawingCompleteRef.current = handleDrawingComplete;
	}, [handleDrawingComplete]);

	const generateLlmDrawing = useCallback(async () => {
		if (!currentDrawer || currentDrawer.type !== "llm") return;

		setIsGeneratingDrawing(true);
		setLlmDrawingSvg(null);

		try {
			const response = await fetch("/api/generate-drawings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: gameState.currentPrompt,
					models: [currentDrawer.id],
				}),
			});

			if (!response.ok) throw new Error("Failed to generate drawing");

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";

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
							setLlmDrawingSvg(event.svg);
						} else if (event.type === "drawing") {
							setLlmDrawingSvg(event.svg);
							setGameState((prev) => ({
								...prev,
								totalCost: prev.totalCost + (event.cost || 0),
								totalTokens: prev.totalTokens + (event.usage?.totalTokens || 0),
							}));
						}
					} catch {}
				}
			}

			setIsGeneratingDrawing(false);
		} catch (error) {
			console.error("Error generating LLM drawing:", error);
			setIsGeneratingDrawing(false);
		}
	}, [currentDrawer, gameState.currentPrompt]);

	useEffect(() => {
		if (gameState.status === "drawing" && !isHumanDrawing) {
			generateLlmDrawing();
		}
	}, [gameState.status, isHumanDrawing, generateLlmDrawing]);

	useEffect(() => {
		if (
			gameState.status === "drawing" &&
			!isHumanDrawing &&
			llmDrawingSvg &&
			!isGeneratingDrawing
		) {
			setAutoTransitionCountdown(2);
			autoTransitionTimerRef.current = setInterval(() => {
				setAutoTransitionCountdown((prev) => {
					if (prev === null || prev <= 1) {
						if (autoTransitionTimerRef.current)
							clearInterval(autoTransitionTimerRef.current);
						handleDrawingCompleteRef.current();
						return null;
					}
					return prev - 1;
				});
			}, 1000);
			return () => {
				if (autoTransitionTimerRef.current)
					clearInterval(autoTransitionTimerRef.current);
				setAutoTransitionCountdown(null);
			};
		}
	}, [gameState.status, isHumanDrawing, llmDrawingSvg, isGeneratingDrawing]);

	const expectedGuesserCount = useMemo(() => {
		const llmGuessers = gameState.participants.filter(
			(p) => p.id !== currentDrawer?.id && p.type === "llm",
		).length;
		const humanIsGuesser = currentDrawer?.type !== "human";
		return llmGuessers + (humanIsGuesser ? 1 : 0);
	}, [gameState.participants, currentDrawer]);

	const allGuessesReceived = useMemo(() => {
		if (gameState.status !== "guessing") return false;
		const receivedCount = Object.keys(llmGuesses).length;
		const humanNeedsToGuess = currentDrawer?.type !== "human";
		const humanHasGuessed = humanNeedsToGuess ? humanGuessSubmitted : true;
		return receivedCount >= expectedGuesserCount && humanHasGuessed;
	}, [
		gameState.status,
		llmGuesses,
		expectedGuesserCount,
		currentDrawer,
		humanGuessSubmitted,
	]);

	const triggerLlmGuesses = useCallback(
		async (imageSource: string) => {
			const guessers = gameState.participants.filter(
				(p) => p.id !== currentDrawer?.id && p.type === "llm",
			);

			if (guessers.length === 0) return;

			let imageDataUrl = imageSource;
			if (imageSource.startsWith("<svg")) {
				imageDataUrl = await svgToPng(imageSource);
			}

			try {
				const response = await fetch("/api/guess-drawing", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						imageDataUrl,
						models: guessers.map((g) => g.id),
					}),
				});

				if (!response.ok) throw new Error("Failed to get guesses");

				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				const decoder = new TextDecoder();
				let buffer = "";

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
							if (event.type === "guess") {
								const timeMs =
									event.generationTimeMs ||
									Date.now() - guessStartTimeRef.current;
								scoreGuess(event.modelId, event.guess, timeMs, false);
							}
						} catch {}
					}
				}
			} catch (error) {
				console.error("Error getting LLM guesses:", error);
			}
		},
		[gameState.participants, currentDrawer],
	);

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
			const svgBlob = new Blob([svgString], {
				type: "image/svg+xml;charset=utf-8",
			});
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

	const scoreGuess = useCallback(
		async (
			participantId: string,
			guess: string,
			timeMs: number,
			isHuman: boolean,
		) => {
			try {
				const response = await fetch("/api/score-guess", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						guess,
						answer: gameState.currentPrompt,
						timeMs,
						isHumanGuesser: isHuman,
					}),
				});

				if (!response.ok) throw new Error("Failed to score guess");

				const result = await response.json();

				const guessResult: GuessResult = {
					participantId,
					guess,
					semanticScore: result.semanticScore,
					timeBonus: result.timeBonus,
					finalScore: result.finalScore,
					timeMs,
				};

				setLlmGuesses((prev) => ({
					...prev,
					[participantId]: guessResult,
				}));
			} catch (error) {
				console.error("Error scoring guess:", error);
			}
		},
		[gameState.currentPrompt],
	);

	const submitHumanGuess = useCallback(async () => {
		if (!humanGuess.trim() || humanGuessSubmitted) return;

		setIsSubmittingGuess(true);
		setHumanGuessSubmitted(true);

		const timeMs = Date.now() - guessStartTimeRef.current;
		await scoreGuess("human", humanGuess.trim(), timeMs, true);

		setIsSubmittingGuess(false);
	}, [humanGuess, humanGuessSubmitted, scoreGuess]);

	const finishGuessing = useCallback(async () => {
		if (timerRef.current) clearInterval(timerRef.current);

		const allGuesses = Object.values(llmGuesses);
		const guesserCount = gameState.participants.filter(
			(p) => p.id !== currentDrawer?.id,
		).length;

		const roundResult: RoundResult = {
			drawerId: currentDrawer?.id || "",
			drawerType: currentDrawer?.type || "human",
			prompt: gameState.currentPrompt,
			svg: llmDrawingSvg || undefined,
			imageDataUrl: isHumanDrawing ? drawingDataUrl : undefined,
			guesses: allGuesses,
		};

		if (gameState.sessionId) {
			try {
				const response = await saveRound.mutateAsync({
					sessionId: gameState.sessionId,
					roundNumber: gameState.currentRound,
					drawerId: currentDrawer?.id || "",
					drawerType: currentDrawer?.type || "human",
					prompt: gameState.currentPrompt,
					svg: llmDrawingSvg || undefined,
					imageDataUrl: isHumanDrawing ? drawingDataUrl : undefined,
					guesserCount,
					drawing:
						!isHumanDrawing && llmDrawingSvg
							? {
									modelId: currentDrawer?.id || "",
									svg: llmDrawingSvg,
								}
							: undefined,
					guesses: allGuesses.map((g) => ({
						participantId: g.participantId,
						participantType:
							g.participantId === "human"
								? ("human" as const)
								: ("llm" as const),
						guess: g.guess,
						semanticScore: g.semanticScore,
						timeBonus: g.timeBonus,
						finalScore: g.finalScore,
						timeMs: g.timeMs,
					})),
				});
				roundResult.maxPossibleScore = response.maxPossibleScore;
				roundResult.topScore = response.topScore;
			} catch (error) {
				console.error("Failed to save round:", error);
			}
		}

		setGameState((prev) => {
			const updatedParticipants = prev.participants.map((p) => {
				const guess = allGuesses.find((g) => g.participantId === p.id);
				if (guess) {
					return {
						...p,
						score: p.score + guess.finalScore,
						guessingScore: p.guessingScore + guess.semanticScore,
					};
				}
				if (p.id === currentDrawer?.id) {
					const drawerBonus = allGuesses.reduce((sum, g) => {
						const multiplier = g.participantId === "human" ? 1.5 : 1;
						return sum + (g.semanticScore > 0.7 ? 10 * multiplier : 0);
					}, 0);
					return {
						...p,
						score: p.score + drawerBonus,
						drawingScore: p.drawingScore + (drawerBonus > 0 ? 1 : 0),
					};
				}
				return p;
			});

			return {
				...prev,
				status: "round-results",
				participants: updatedParticipants,
				roundHistory: [...prev.roundHistory, roundResult],
			};
		});
	}, [
		llmGuesses,
		currentDrawer,
		gameState.currentPrompt,
		gameState.sessionId,
		gameState.currentRound,
		gameState.participants,
		llmDrawingSvg,
		isHumanDrawing,
		drawingDataUrl,
		saveRound,
	]);

	useEffect(() => {
		finishGuessingRef.current = finishGuessing;
	}, [finishGuessing]);

	useEffect(() => {
		if (gameState.status === "guessing" && allGuessesReceived) {
			if (finishGuessingCalledRef.current) return;
			setAutoTransitionCountdown(3);
			autoTransitionTimerRef.current = setInterval(() => {
				setAutoTransitionCountdown((prev) => {
					if (prev === null || prev <= 1) {
						if (autoTransitionTimerRef.current)
							clearInterval(autoTransitionTimerRef.current);
						if (!finishGuessingCalledRef.current) {
							finishGuessingCalledRef.current = true;
							finishGuessingRef.current();
						}
						return null;
					}
					return prev - 1;
				});
			}, 1000);
			return () => {
				if (autoTransitionTimerRef.current)
					clearInterval(autoTransitionTimerRef.current);
				setAutoTransitionCountdown(null);
			};
		}
	}, [gameState.status, allGuessesReceived]);

	const nextRound = useCallback(() => {
		const nextDrawerIndex =
			(gameState.currentDrawerIndex + 1) % gameState.participants.length;
		const isGameOver = gameState.currentRound >= gameState.totalRounds;

		if (isGameOver) {
			saveSession.mutate({
				mode: "pictionary",
				prompt: gameState.roundHistory.map((r) => r.prompt).join(", "),
				totalCost: gameState.totalCost,
				totalTokens: gameState.totalTokens,
				drawings: gameState.roundHistory.map((r) => ({
					modelId: r.drawerId,
					svg: r.svg || r.imageDataUrl || "",
				})),
				guesses: gameState.roundHistory.flatMap((r) =>
					r.guesses.map((g) => ({
						modelId: g.participantId,
						guess: g.guess,
						isCorrect: g.semanticScore > 0.7,
						semanticScore: g.semanticScore,
						timeBonus: g.timeBonus,
						finalScore: g.finalScore,
						isHuman: g.participantId === "human",
					})),
				),
			});
			setGameState((prev) => ({
				...prev,
				status: "game-over",
			}));
		} else {
			const prompt = getRandomPrompt();
			setGameState((prev) => ({
				...prev,
				status: "drawing",
				currentRound: prev.currentRound + 1,
				currentDrawerIndex: nextDrawerIndex,
				currentPrompt: prompt,
				currentDrawing: null,
			}));
			setDrawingDataUrl("");
			setLlmDrawingSvg(null);
			setHumanGuess("");
			setLlmGuesses({});
			setHumanGuessSubmitted(false);
			finishGuessingCalledRef.current = false;
			setAutoTransitionCountdown(null);
		}
	}, [
		gameState.currentDrawerIndex,
		gameState.participants.length,
		gameState.currentRound,
		gameState.totalRounds,
		gameState.roundHistory,
		gameState.totalCost,
		gameState.totalTokens,
		saveSession,
	]);

	useEffect(() => {
		nextRoundRef.current = nextRound;
	}, [nextRound]);

	useEffect(() => {
		if (gameState.status === "round-results") {
			setAutoTransitionCountdown(3);
			autoTransitionTimerRef.current = setInterval(() => {
				setAutoTransitionCountdown((prev) => {
					if (prev === null || prev <= 1) {
						if (autoTransitionTimerRef.current)
							clearInterval(autoTransitionTimerRef.current);
						nextRoundRef.current();
						return null;
					}
					return prev - 1;
				});
			}, 1000);
			return () => {
				if (autoTransitionTimerRef.current)
					clearInterval(autoTransitionTimerRef.current);
				setAutoTransitionCountdown(null);
			};
		}
	}, [gameState.status, gameState.currentRound]);

	const sortedParticipants = useMemo(() => {
		return [...gameState.participants].sort((a, b) => b.score - a.score);
	}, [gameState.participants]);

	return (
		<TooltipProvider>
			<main className="min-h-screen p-6 md:p-8">
				<div className="max-w-6xl mx-auto space-y-8">
					<header className="flex items-center justify-between">
						<Link href="/">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="size-4" />
								Back
							</Button>
						</Link>
						<div className="text-center">
							<h1 className="text-2xl font-mono font-light">Pictionary</h1>
							<p className="text-sm text-muted-foreground">
								You vs AI - Who draws & guesses best?
							</p>
						</div>
						<div className="flex items-center gap-2">
							{gameState.status !== "setup" && (
								<>
									<Tooltip>
										<TooltipTrigger asChild>
											<Badge variant="outline" className="cursor-help">
												<DollarSign className="size-3" />
												{formatCost(gameState.totalCost)}
											</Badge>
										</TooltipTrigger>
										<TooltipContent>
											<p>Total cost</p>
											<p className="text-xs text-muted-foreground">
												{gameState.totalTokens.toLocaleString()} tokens
											</p>
										</TooltipContent>
									</Tooltip>
									<Badge variant="outline">
										<Trophy className="size-3" />
										Round {gameState.currentRound}/{gameState.totalRounds}
									</Badge>
								</>
							)}
						</div>
					</header>

					{gameState.status === "setup" && (
						<div className="space-y-6">
							<div className="text-center space-y-2">
								<Zap className="size-12 mx-auto text-primary" />
								<h2 className="text-2xl font-light">Choose Your Opponents</h2>
								<p className="text-muted-foreground">
									Pick 1-5 AI models to challenge. Everyone takes turns drawing
									and guessing!
								</p>
							</div>

							<Card>
								<CardContent className="p-6">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
										{visionModels.map((model) => {
											const isSelected = selectedModels.includes(model.id);
											const isDisabled =
												!isSelected && selectedModels.length >= 5;
											return (
												<button
													key={model.id}
													type="button"
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
								<Button
									variant="outline"
									onClick={shuffleSelection}
									disabled={createSession.isPending}
								>
									<Shuffle className="size-4" />
									Surprise Me
								</Button>
								<Button
									size="lg"
									onClick={startGame}
									disabled={
										selectedModels.length < 1 || createSession.isPending
									}
								>
									{createSession.isPending ? (
										<Spinner className="size-4" />
									) : (
										<Play className="size-4" />
									)}
									{createSession.isPending ? "Starting..." : "Let's Play!"}
								</Button>
							</div>
						</div>
					)}

					{gameState.status === "drawing" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<div className="flex items-center justify-center gap-4">
									<Badge
										variant="outline"
										className={cn(
											"gap-2",
											currentDrawer?.type === "human"
												? "bg-emerald-500/10"
												: "bg-blue-500/10",
										)}
									>
										{currentDrawer?.type === "human" ? (
											<User className="size-3" />
										) : (
											<Bot className="size-3" />
										)}
										{currentDrawer?.name} is drawing
									</Badge>
									<Badge
										variant="secondary"
										className="text-lg px-4 py-1 tabular-nums"
									>
										<Clock className="size-4 mr-2" />
										{timeRemaining}s
									</Badge>
								</div>
								{isHumanDrawing && (
									<Badge variant="secondary" className="text-lg px-6 py-2">
										Draw: &ldquo;{gameState.currentPrompt}&rdquo;
									</Badge>
								)}
								{!isHumanDrawing && (
									<p className="text-muted-foreground">
										Watch {currentDrawer?.name} draw...
									</p>
								)}
							</div>

							<div className="flex flex-col items-center gap-6">
								{isHumanDrawing ? (
									<DrawingCanvas
										onDrawingChange={setDrawingDataUrl}
										width={400}
										height={400}
										className="max-w-md w-full"
									/>
								) : (
									<Card className="max-w-md w-full overflow-hidden">
										<div className="aspect-square bg-white flex items-center justify-center">
											{isGeneratingDrawing && !llmDrawingSvg && (
												<Spinner className="size-8" />
											)}
											{llmDrawingSvg && (
												<div
													className="w-full h-full"
													dangerouslySetInnerHTML={{ __html: llmDrawingSvg }}
												/>
											)}
										</div>
									</Card>
								)}

								{isHumanDrawing && (
									<Button
										size="lg"
										onClick={handleDrawingComplete}
										disabled={!drawingDataUrl}
									>
										<Send className="size-4" />
										Submit Drawing
									</Button>
								)}
								{!isHumanDrawing &&
									llmDrawingSvg &&
									!isGeneratingDrawing &&
									autoTransitionCountdown !== null && (
										<Badge
											variant="secondary"
											className="text-lg px-6 py-2 tabular-nums"
										>
											<Clock className="size-4 mr-2" />
											Starting in {autoTransitionCountdown}s...
										</Badge>
									)}
							</div>
						</div>
					)}

					{gameState.status === "guessing" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<Badge
									variant="secondary"
									className="text-lg px-4 py-1 tabular-nums"
								>
									<Clock className="size-4 mr-2" />
									{timeRemaining}s to guess
								</Badge>
								{!isHumanDrawing && (
									<p className="text-muted-foreground">
										What did {currentDrawer?.name} draw?
									</p>
								)}
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								<Card className="overflow-hidden">
									<div className="aspect-square bg-white flex items-center justify-center">
										{isHumanDrawing && drawingDataUrl && (
											<img
												src={drawingDataUrl}
												alt="Drawing"
												className="w-full h-full object-contain"
											/>
										)}
										{!isHumanDrawing && llmDrawingSvg && (
											<div
												className="w-full h-full"
												dangerouslySetInnerHTML={{ __html: llmDrawingSvg }}
											/>
										)}
									</div>
								</Card>

								<div className="space-y-4">
									{currentDrawer?.type !== "human" && (
										<Card>
											<CardContent className="p-4">
												<div className="flex items-center gap-3 mb-3">
													<div
														className="size-3 rounded-full"
														style={{ backgroundColor: HUMAN_PARTICIPANT.color }}
													/>
													<span className="font-medium">Your Guess</span>
												</div>
												{!humanGuessSubmitted ? (
													<div className="flex gap-2">
														<Input
															value={humanGuess}
															onChange={(e) => setHumanGuess(e.target.value)}
															placeholder="Type your guess..."
															onKeyDown={(e) =>
																e.key === "Enter" && submitHumanGuess()
															}
															disabled={isSubmittingGuess}
														/>
														<Button
															onClick={submitHumanGuess}
															disabled={!humanGuess.trim() || isSubmittingGuess}
														>
															{isSubmittingGuess ? (
																<Spinner className="size-4" />
															) : (
																<Send className="size-4" />
															)}
														</Button>
													</div>
												) : (
													<div className="text-lg font-medium text-primary">
														&ldquo;{humanGuess}&rdquo;
														{llmGuesses.human && (
															<span className="ml-2 text-sm text-muted-foreground">
																(
																{Math.round(
																	llmGuesses.human.semanticScore * 100,
																)}
																% match)
															</span>
														)}
													</div>
												)}
											</CardContent>
										</Card>
									)}

									<div className="space-y-3">
										{gameState.participants
											.filter(
												(p) => p.id !== currentDrawer?.id && p.type === "llm",
											)
											.map((participant) => {
												const guess = llmGuesses[participant.id];
												const canShowGuess =
													humanGuessSubmitted || isHumanDrawing;
												return (
													<Card
														key={participant.id}
														className={cn(
															"transition-all",
															canShowGuess &&
																guess &&
																guess.semanticScore > 0.7 &&
																"ring-2 ring-green-500",
														)}
													>
														<CardContent className="p-4">
															<div className="flex items-center gap-3">
																<div
																	className={cn(
																		"size-3 rounded-full shrink-0",
																		!guess && "animate-pulse",
																	)}
																	style={{ backgroundColor: participant.color }}
																/>
																<span className="font-medium">
																	{participant.name}
																</span>
																{!guess && (
																	<Spinner className="size-4 ml-auto" />
																)}
																{guess && !canShowGuess && (
																	<Badge
																		variant="secondary"
																		className="ml-auto"
																	>
																		Ready
																	</Badge>
																)}
																{guess && canShowGuess && (
																	<Badge variant="outline" className="ml-auto">
																		{Math.round(guess.semanticScore * 100)}%
																	</Badge>
																)}
															</div>
															{guess && canShowGuess && (
																<div className="mt-2 text-lg">
																	&ldquo;{guess.guess}&rdquo;
																</div>
															)}
														</CardContent>
													</Card>
												);
											})}
									</div>

									{allGuessesReceived && autoTransitionCountdown !== null && (
										<Badge
											variant="secondary"
											className="text-lg px-6 py-2 tabular-nums w-full justify-center"
										>
											<Clock className="size-4 mr-2" />
											Round ending in {autoTransitionCountdown}s...
										</Badge>
									)}
								</div>
							</div>
						</div>
					)}

					{gameState.status === "round-results" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<Badge variant="secondary" className="text-lg px-6 py-2">
									Answer: &ldquo;{gameState.currentPrompt}&rdquo;
								</Badge>
								<h2 className="text-2xl font-light">
									Round {gameState.currentRound} Results
								</h2>
								{gameState.roundHistory[gameState.roundHistory.length - 1]
									?.maxPossibleScore && (
									<p className="text-sm text-muted-foreground">
										Top score:{" "}
										{
											gameState.roundHistory[gameState.roundHistory.length - 1]
												.topScore
										}
										/
										{
											gameState.roundHistory[gameState.roundHistory.length - 1]
												.maxPossibleScore
										}{" "}
										(
										{Math.round(
											((gameState.roundHistory[
												gameState.roundHistory.length - 1
											].topScore ?? 0) /
												(gameState.roundHistory[
													gameState.roundHistory.length - 1
												].maxPossibleScore ?? 1)) *
												100,
										)}
										% efficiency)
									</p>
								)}
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								<Card className="overflow-hidden">
									<div className="aspect-square bg-white flex items-center justify-center">
										{gameState.roundHistory[gameState.roundHistory.length - 1]
											?.imageDataUrl && (
											<img
												src={
													gameState.roundHistory[
														gameState.roundHistory.length - 1
													].imageDataUrl
												}
												alt="Drawing"
												className="w-full h-full object-contain"
											/>
										)}
										{gameState.roundHistory[gameState.roundHistory.length - 1]
											?.svg && (
											<div
												className="w-full h-full"
												dangerouslySetInnerHTML={{
													__html:
														gameState.roundHistory[
															gameState.roundHistory.length - 1
														].svg!,
												}}
											/>
										)}
									</div>
								</Card>

								<div className="space-y-3">
									{Object.values(llmGuesses)
										.sort((a, b) => b.finalScore - a.finalScore)
										.map((guess) => {
											const participant = gameState.participants.find(
												(p) => p.id === guess.participantId,
											);
											if (!participant) return null;
											return (
												<Card
													key={guess.participantId}
													className={cn(
														guess.semanticScore > 0.7 &&
															"ring-2 ring-green-500 bg-green-500/5",
													)}
												>
													<CardContent className="p-4">
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-3">
																<div
																	className="size-3 rounded-full"
																	style={{ backgroundColor: participant.color }}
																/>
																<span className="font-medium">
																	{participant.name}
																</span>
															</div>
															<Badge variant="secondary">
																+{guess.finalScore} pts
															</Badge>
														</div>
														<div className="mt-2 text-lg">
															&ldquo;{guess.guess}&rdquo;
														</div>
														<div className="mt-1 text-sm text-muted-foreground">
															{Math.round(guess.semanticScore * 100)}% match
															{guess.timeBonus > 0 &&
																` • +${guess.timeBonus} time bonus`}
														</div>
													</CardContent>
												</Card>
											);
										})}
								</div>
							</div>

							<Card>
								<CardContent className="p-4">
									<div className="flex items-center gap-3 mb-3">
										<Trophy className="size-4 text-yellow-500" />
										<span className="font-medium">Standings</span>
									</div>
									<div className="space-y-2">
										{sortedParticipants.map((p, index) => (
											<div key={p.id} className="flex items-center gap-3">
												<span
													className={cn(
														"w-6 text-center font-mono",
														index === 0 && "text-yellow-500 font-bold",
													)}
												>
													{index + 1}
												</span>
												<div
													className="size-3 rounded-full"
													style={{ backgroundColor: p.color }}
												/>
												<span className="flex-1">{p.name}</span>
												<span className="font-bold">{p.score} pts</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{autoTransitionCountdown !== null && (
								<div className="flex justify-center">
									<Badge
										variant="secondary"
										className="text-lg px-6 py-2 tabular-nums"
									>
										<Clock className="size-4 mr-2" />
										{gameState.currentRound >= gameState.totalRounds
											? `Final results in ${autoTransitionCountdown}s...`
											: `Next round in ${autoTransitionCountdown}s...`}
									</Badge>
								</div>
							)}
						</div>
					)}

					{gameState.status === "game-over" && (
						<div className="space-y-6">
							<div className="text-center space-y-4">
								<Trophy className="size-16 mx-auto text-yellow-500" />
								<h2 className="text-3xl font-light">
									{sortedParticipants[0]?.id === "human"
										? "You Won!"
										: "Game Complete!"}
								</h2>
							</div>

							{sortedParticipants[0] && (
								<Card className="bg-yellow-500/10 border-yellow-500/50">
									<CardContent className="p-6 text-center">
										<div
											className="size-8 rounded-full mx-auto mb-2"
											style={{ backgroundColor: sortedParticipants[0].color }}
										/>
										<h3 className="text-2xl font-bold">
											{sortedParticipants[0].name}
										</h3>
										<p className="text-yellow-600">
											{sortedParticipants[0].id === "human"
												? `You scored ${sortedParticipants[0].score} points!`
												: `Champion with ${sortedParticipants[0].score} points`}
										</p>
									</CardContent>
								</Card>
							)}

							<Card>
								<CardContent className="p-6">
									<h3 className="text-lg font-medium mb-4">Final Standings</h3>
									<div className="space-y-3">
										{sortedParticipants.map((p, index) => (
											<div key={p.id} className="flex items-center gap-3">
												<span
													className={cn(
														"w-6 text-center font-mono",
														index === 0 && "text-yellow-500 font-bold",
													)}
												>
													{index + 1}
												</span>
												<div
													className="size-3 rounded-full"
													style={{ backgroundColor: p.color }}
												/>
												<span className="flex-1">{p.name}</span>
												<div className="text-right">
													<div className="font-bold">{p.score} pts</div>
													<div className="text-xs text-muted-foreground">
														Draw: {p.drawingScore.toFixed(1)} • Guess:{" "}
														{p.guessingScore.toFixed(1)}
													</div>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							<div className="flex justify-center gap-4">
								<Button
									variant="outline"
									onClick={() =>
										setGameState((prev) => ({ ...prev, status: "setup" }))
									}
								>
									New Opponents
								</Button>
								<Button size="lg" onClick={() => window.location.reload()}>
									<RotateCcw className="size-4" />
									Rematch
								</Button>
							</div>
						</div>
					)}
				</div>
			</main>
		</TooltipProvider>
	);
}
