"use client";

import {
	ArrowRight,
	Check,
	Clock,
	Dices,
	MessageCircle,
	Play,
	Send,
	Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DrawingCanvas } from "@/components/drawing-canvas";
import {
	ModelSelector,
	ModelSelectorTrigger,
} from "@/components/model-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	getModelById,
	getModelStyle,
	getVisionModels,
	MODEL_STYLE_INFO,
	shuffleModels,
	type ModelConfig,
} from "@/lib/models";
import { getRandomPrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface Player {
	id: string;
	name: string;
	color: string;
	isHuman: boolean;
}

interface GameState {
	status: "idle" | "playing" | "generating" | "turn-ended" | "game-over";
	currentRound: number;
	currentTurnIndex: number;
	secretPrompt: string;
	hint: string;
	revealedIndices: number[];
	timeRemaining: number;
	winner: Player | null;
	aiSvg: string | null;
}

interface ChatMessage {
	id: string;
	playerId: string;
	playerName: string;
	playerColor: string;
	guess: string;
	timestamp: number;
	isCorrect: boolean;
	similarity?: number;
}

function generateHint(prompt: string): string {
	return prompt
		.split("")
		.map((char) => (char === " " ? "  " : "_"))
		.join(" ");
}

function getLetterIndices(prompt: string): number[] {
	return prompt.split("").reduce((indices, char, i) => {
		if (char !== " ") indices.push(i);
		return indices;
	}, [] as number[]);
}

function generateHintWithReveals(
	prompt: string,
	revealedIndices: number[],
): string {
	return prompt
		.split("")
		.map((char, i) => {
			if (char === " ") return "  ";
			if (revealedIndices.includes(i)) return char;
			return "_";
		})
		.join(" ");
}

function revealRandomLetter(
	prompt: string,
	revealedIndices: number[],
): number[] {
	const allLetterIndices = getLetterIndices(prompt);
	const unrevealedIndices = allLetterIndices.filter(
		(i) => !revealedIndices.includes(i),
	);

	if (unrevealedIndices.length === 0) return revealedIndices;

	const randomIndex =
		unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
	return [...revealedIndices, randomIndex];
}

// Semantic guess checking via API
async function checkGuessSemantics(
	guess: string,
	prompt: string,
): Promise<{ isCorrect: boolean; similarity: number }> {
	try {
		const response = await fetch("/api/check-guess", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ guess, prompt }),
		});

		if (!response.ok) {
			throw new Error("Failed to check guess");
		}

		return await response.json();
	} catch {
		// Fallback to simple comparison
		const normalize = (text: string) =>
			text
				.toLowerCase()
				.trim()
				.replace(/^(a|an|the)\s+/i, "")
				.replace(/[^a-z0-9\s]/g, "");
		const isCorrect = normalize(guess) === normalize(prompt);
		return { isCorrect, similarity: isCorrect ? 1.0 : 0 };
	}
}

// Convert SVG string to PNG data URL
async function svgToPngDataUrl(svgString: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = 400;
			canvas.height = 400;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}
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
}

const TOTAL_ROUNDS = 2;
const TURN_DURATION = 50; // seconds

const DEFAULT_MODEL_IDS = [
	"meta/llama-4-scout",        // 432ms 🚀
	"google/gemini-2.5-flash-lite", // 502ms ⚡
	"mistral/pixtral-12b",       // 517ms ⚡
	"anthropic/claude-3.5-haiku", // 925ms ⚡
];

export default function HumanPlayPage() {
	const isMobile = useIsMobile();
	const visionModels = useMemo(() => getVisionModels(), []);
	const [selectedModelIds, setSelectedModelIds] =
		useState<string[]>(DEFAULT_MODEL_IDS);
	const [thinkingModelIds, setThinkingModelIds] = useState<string[]>([]);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

	const handleRandomModels = useCallback(() => {
		const shuffled = shuffleModels(visionModels, 4);
		setSelectedModelIds(shuffled.map((m) => m.id));
	}, [visionModels]);

	const selectedModels = useMemo(
		() =>
			selectedModelIds
				.map((id) => getModelById(id))
				.filter(Boolean) as ModelConfig[],
		[selectedModelIds],
	);

	const players: Player[] = useMemo(
		() => [
			{ id: "human", name: "You", color: "hsl(var(--primary))", isHuman: true },
			...selectedModels.map((m) => ({
				id: m.id,
				name: m.name,
				color: m.color,
				isHuman: false,
			})),
		],
		[selectedModels],
	);

	const [gameState, setGameState] = useState<GameState>({
		status: "idle",
		currentRound: 1,
		currentTurnIndex: 0,
		secretPrompt: "",
		hint: "",
		revealedIndices: [],
		timeRemaining: TURN_DURATION,
		winner: null,
		aiSvg: null,
	});

	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [drawingDataUrl, setDrawingDataUrl] = useState<string>("");
	const [isGuessing, setIsGuessing] = useState(false);
	const [humanGuess, setHumanGuess] = useState("");
	const chatContainerRef = useRef<HTMLDivElement>(null);

	const currentDrawer = players[gameState.currentTurnIndex];
	const isHumanTurn = currentDrawer?.isHuman ?? false;
	const isGameActive =
		gameState.status === "playing" || gameState.status === "generating";

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = 0;
		}
	}, [chatMessages]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const endTurn = useCallback((winner: Player | null) => {
		setGameState((prev) => ({
			...prev,
			status: "turn-ended",
			winner,
		}));
	}, []);

	const generateAiDrawing = useCallback(
		async (promptOverride?: string, drawerIdOverride?: string) => {
			const drawerId = drawerIdOverride || players[gameState.currentTurnIndex]?.id;
			if (!drawerId) return;

			const prompt = promptOverride || gameState.secretPrompt;
			if (!prompt) {
				console.error("No prompt available for AI drawing");
				return;
			}

			setGameState((prev) => ({ ...prev, status: "generating" }));

			try {
				const response = await fetch("/api/generate-drawings", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						prompt,
						models: [drawerId],
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to generate drawing");
				}

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
						const jsonStr = line.slice(6);

						try {
							const event = JSON.parse(jsonStr);

							if (event.type === "partial" && event.svg) {
								setGameState((prev) => ({
									...prev,
									aiSvg: event.svg,
								}));
							} else if (event.type === "drawing" && event.svg) {
								setGameState((prev) => ({
									...prev,
									status: "playing",
									aiSvg: event.svg,
								}));
							}
						} catch (e) {
							console.error("Failed to parse SSE event:", e);
						}
					}
				}
			} catch (error) {
				console.error("Error generating AI drawing:", error);
				endTurn(null);
			}
		},
		[players, gameState.currentTurnIndex, gameState.secretPrompt, endTurn],
	);

	// Advance to next turn and start it immediately
	const advanceToNextTurn = useCallback(() => {
		const nextTurnIndex = gameState.currentTurnIndex + 1;
		const totalPlayers = players.length;

		if (nextTurnIndex >= totalPlayers) {
			const nextRound = gameState.currentRound + 1;

			if (nextRound > TOTAL_ROUNDS) {
				setGameState((prev) => ({
					...prev,
					status: "game-over",
					winner: null,
				}));
				return;
			}

			// New round - reset to first player and start immediately
			const newPrompt = getRandomPrompt();
			const nextDrawerIsHuman = players[0]?.isHuman ?? false;

			setChatMessages([]);
			setDrawingDataUrl("");
			setHumanGuess("");

			if (nextDrawerIsHuman) {
				setGameState({
					status: "playing",
					currentRound: nextRound,
					currentTurnIndex: 0,
					secretPrompt: newPrompt,
					hint: generateHint(newPrompt),
					revealedIndices: [],
					timeRemaining: TURN_DURATION,
					winner: null,
					aiSvg: null,
				});
			} else {
				const nextDrawerId = players[0]?.id;
				setGameState({
					status: "generating",
					currentRound: nextRound,
					currentTurnIndex: 0,
					secretPrompt: newPrompt,
					hint: generateHint(newPrompt),
					revealedIndices: [],
					timeRemaining: TURN_DURATION,
					winner: null,
					aiSvg: null,
				});
				setTimeout(() => generateAiDrawing(newPrompt, nextDrawerId), 100);
			}
		} else {
			// Next player in same round - start immediately
			const newPrompt = getRandomPrompt();
			const nextDrawer = players[nextTurnIndex];
			const nextDrawerIsHuman = nextDrawer?.isHuman ?? false;

			setChatMessages([]);
			setDrawingDataUrl("");
			setHumanGuess("");

			if (nextDrawerIsHuman) {
				setGameState({
					status: "playing",
					currentRound: gameState.currentRound,
					currentTurnIndex: nextTurnIndex,
					secretPrompt: newPrompt,
					hint: generateHint(newPrompt),
					revealedIndices: [],
					timeRemaining: TURN_DURATION,
					winner: null,
					aiSvg: null,
				});
			} else {
				setGameState({
					status: "generating",
					currentRound: gameState.currentRound,
					currentTurnIndex: nextTurnIndex,
					secretPrompt: newPrompt,
					hint: generateHint(newPrompt),
					revealedIndices: [],
					timeRemaining: TURN_DURATION,
					winner: null,
					aiSvg: null,
				});
				setTimeout(() => generateAiDrawing(newPrompt, nextDrawer?.id), 100);
			}
		}
	}, [gameState.currentTurnIndex, gameState.currentRound, players, generateAiDrawing]);

	const triggerAiGuess = useCallback(
		async (imageDataUrl: string) => {
			if (!imageDataUrl || isGuessing) return;

			setIsGuessing(true);

			const guessingModels = selectedModels.filter(
				(m) => m.id !== currentDrawer?.id,
			);

			setThinkingModelIds(guessingModels.map((m) => m.id));

			try {
				const response = await fetch("/api/guess-drawing", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						imageDataUrl,
						models: guessingModels.map((m) => m.id),
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to get guesses");
				}

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
						const jsonStr = line.slice(6);

						try {
							const event = JSON.parse(jsonStr);

							if (event.type === "guess") {
								const model = selectedModels.find(
									(m) => m.id === event.modelId,
								);
								if (model) {
									setThinkingModelIds((prev) =>
										prev.filter((id) => id !== event.modelId),
									);
									checkGuessSemantics(event.guess, gameState.secretPrompt).then(
										({ isCorrect, similarity }) => {
											const newMessage: ChatMessage = {
												id: `${event.modelId}-${Date.now()}`,
												playerId: event.modelId,
												playerName: model.name,
												playerColor: model.color,
												guess: event.guess,
												timestamp: Date.now(),
												isCorrect,
												similarity,
											};

											setChatMessages((prev) => [...prev, newMessage]);

											// Show toast on mobile when user is drawing
											if (isMobile && isHumanTurn) {
												toast(
													<div className="flex items-center gap-2 text-xs">
														<div
															className="size-2 rounded-full shrink-0"
															style={{ backgroundColor: model.color }}
														/>
														<span className="font-medium truncate">
															{model.name}:
														</span>
														<span className="truncate text-muted-foreground">
															"{event.guess}"
														</span>
														{isCorrect && (
															<Check className="size-3 text-green-500 shrink-0" />
														)}
													</div>,
													{
														duration: 2000,
														className: "py-2 px-3",
													},
												);
											}

											if (isCorrect) {
												const winnerPlayer = players.find(
													(p) => p.id === event.modelId,
												);
												if (winnerPlayer) {
													endTurn(winnerPlayer);
												}
											}
										},
									);
								}
							}
						} catch (e) {
							console.error("Failed to parse SSE event:", e);
						}
					}
				}
			} catch (error) {
				console.error("Error getting guesses:", error);
			} finally {
				setIsGuessing(false);
				setThinkingModelIds([]);
			}
		},
		[
			selectedModels,
			currentDrawer?.id,
			gameState.secretPrompt,
			isGuessing,
			players,
			endTurn,
			isMobile,
			isHumanTurn,
		],
	);

	useEffect(() => {
		if (gameState.status !== "playing") return;

		const interval = setInterval(async () => {
			setGameState((prev) => {
				const newTime = prev.timeRemaining - 1;

				if (newTime <= 0) {
					setTimeout(() => endTurn(null), 0);
					return {
						...prev,
						timeRemaining: 0,
					};
				}

				const elapsedTime = TURN_DURATION - newTime;

				// cada 30' aparece una nueva letra
				const shouldReveal =
					!isHumanTurn && elapsedTime > 0 && elapsedTime % 30 === 0;

				let newRevealedIndices = prev.revealedIndices;
				let newHint = prev.hint;

				if (shouldReveal) {
					newRevealedIndices = revealRandomLetter(
						prev.secretPrompt,
						prev.revealedIndices,
					);
					newHint = generateHintWithReveals(
						prev.secretPrompt,
						newRevealedIndices,
					);
				}

				const shouldGuess =
					newTime % 10 === 0 && newTime > 0 && newTime < TURN_DURATION;
				if (shouldGuess) {
					if (isHumanTurn && drawingDataUrl) {
						setTimeout(() => triggerAiGuess(drawingDataUrl), 0);
					} else if (!isHumanTurn && prev.aiSvg) {
						svgToPngDataUrl(prev.aiSvg)
							.then((pngDataUrl) => {
								triggerAiGuess(pngDataUrl);
							})
							.catch(console.error);
					}
				}

				return {
					...prev,
					timeRemaining: newTime,
					revealedIndices: newRevealedIndices,
					hint: newHint,
				};
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [gameState.status, isHumanTurn, drawingDataUrl, triggerAiGuess, endTurn]);

	// Start a new turn
	const startTurn = () => {
		const newPrompt = getRandomPrompt();
		setChatMessages([]);
		setDrawingDataUrl("");
		setHumanGuess("");

		if (isHumanTurn) {
			setGameState((prev) => ({
				...prev,
				status: "playing",
				secretPrompt: newPrompt,
				hint: generateHint(newPrompt),
				revealedIndices: [],
				timeRemaining: TURN_DURATION,
				winner: null,
				aiSvg: null,
			}));
		} else {
			setGameState((prev) => ({
				...prev,
				secretPrompt: newPrompt,
				hint: generateHint(newPrompt),
				revealedIndices: [],
				timeRemaining: TURN_DURATION,
				winner: null,
				aiSvg: null,
			}));

			// Pass prompt and drawer ID directly to avoid stale closure
			setTimeout(() => generateAiDrawing(newPrompt, currentDrawer?.id), 100);
		}
	};

	// Start new game
	const startGame = () => {
		setGameState({
			status: "idle",
			currentRound: 1,
			currentTurnIndex: 0,
			secretPrompt: "",
			hint: "",
			revealedIndices: [],
			timeRemaining: TURN_DURATION,
			winner: null,
			aiSvg: null,
		});
		setChatMessages([]);
		setDrawingDataUrl("");
		setHumanGuess("");
	};

	const submitHumanGuess = async () => {
		if (!humanGuess.trim() || isHumanTurn) return;

		const guess = humanGuess;
		setHumanGuess("");

		const { isCorrect, similarity } = await checkGuessSemantics(
			guess,
			gameState.secretPrompt,
		);

		const newMessage: ChatMessage = {
			id: `human-${Date.now()}`,
			playerId: "human",
			playerName: "You",
			playerColor: "hsl(var(--primary))",
			guess,
			timestamp: Date.now(),
			isCorrect,
			similarity,
		};

		setChatMessages((prev) => [...prev, newMessage]);

		if (isCorrect) {
			const humanPlayer = players.find((p) => p.isHuman);
			if (humanPlayer) {
				endTurn(humanPlayer);
			}
		}
	};

	const timerUrgent =
		gameState.timeRemaining <= 10 && gameState.status === "playing";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-[calc(100dvh-11rem)] overflow-hidden">
			{/* Main Panel */}
			<div className="flex flex-col min-h-0 overflow-hidden">
				{/* Header - responsive layout */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3 shrink-0">
					{/* Top row on mobile: Models + Timer */}
					<div className="flex items-center gap-2">
						<ButtonGroup>
							<ModelSelectorTrigger
								models={visionModels}
								selectedIds={selectedModelIds}
								onClick={() => setModelSelectorOpen(true)}
								disabled={isGameActive}
								thinkingIds={thinkingModelIds}
								currentDrawerId={!isHumanTurn ? currentDrawer?.id : undefined}
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

						<div className="flex items-center gap-1.5 ml-auto sm:hidden">
							{gameState.status === "playing" && (
								<Badge
									variant="outline"
									className="text-[10px] tabular-nums font-mono px-1.5 py-0.5"
								>
									{gameState.timeRemaining % 10 || 10}s
								</Badge>
							)}
							<Badge
								variant={isGameActive ? "default" : "secondary"}
								className={cn(
									"text-xs px-2 py-0.5 tabular-nums font-mono",
									timerUrgent &&
										"bg-destructive text-destructive-foreground animate-pulse",
								)}
							>
								<Clock
									className={cn("size-3 mr-0.5", timerUrgent && "animate-spin")}
								/>
								{formatTime(gameState.timeRemaining)}
							</Badge>
							{gameState.status === "idle" && (
								<Button
									onClick={startTurn}
									size="sm"
									className="gap-1 px-2 h-7 text-xs"
								>
									<Play className="size-3" />
									Start
								</Button>
							)}
						</div>
					</div>

					{/* Prompt - full width on mobile when playing */}
					{gameState.status === "playing" && (
						<div className="flex-1 text-center min-w-0 py-1 sm:py-0">
							{isHumanTurn ? (
								<span className="text-xs sm:text-sm font-semibold">
									Draw:{" "}
									<span className="text-primary">{gameState.secretPrompt}</span>
								</span>
							) : (
								<span className="text-xs sm:text-sm font-mono tracking-wider sm:tracking-widest">
									{gameState.secretPrompt.split("").map((char, i) => {
										if (char === " ")
											return (
												<span key={i} className="mx-0.5 sm:mx-1">
													{" "}
												</span>
											);
										const isRevealed = gameState.revealedIndices.includes(i);
										return (
											<span
												key={i}
												className={
													isRevealed
														? "text-primary font-bold"
														: "text-muted-foreground"
												}
											>
												{isRevealed ? char : "_"}
											</span>
										);
									})}
								</span>
							)}
						</div>
					)}

					{/* Desktop only: right side controls */}
					<div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
						{gameState.status === "playing" && (
							<Badge
								variant="outline"
								className="text-xs tabular-nums font-mono"
							>
								Guess in {gameState.timeRemaining % 10 || 10}s
							</Badge>
						)}
						<span className="text-sm text-muted-foreground whitespace-nowrap">
							Round {gameState.currentRound}/{TOTAL_ROUNDS}
						</span>
						<Badge
							variant={isGameActive ? "default" : "secondary"}
							className={cn(
								"text-sm px-2.5 py-1 tabular-nums font-mono whitespace-nowrap",
								timerUrgent &&
									"bg-destructive text-destructive-foreground animate-pulse",
							)}
						>
							<Clock
								className={cn("size-3.5 mr-1", timerUrgent && "animate-spin")}
							/>
							{formatTime(gameState.timeRemaining)}
						</Badge>
						{gameState.status === "idle" && (
							<Button
								onClick={startTurn}
								size="sm"
								className="gap-1.5 px-4 shadow-lg whitespace-nowrap"
							>
								<Play className="size-4" />
								{gameState.currentTurnIndex === 0 &&
								gameState.currentRound === 1
									? "Start Game"
									: "Start Turn"}
							</Button>
						)}
					</div>
				</div>

				{/* Prompt display for non-playing states */}
				{(gameState.status === "generating" ||
					gameState.status === "turn-ended") && (
					<div className="text-center mb-3 shrink-0">
						<span className="text-base font-mono tracking-widest">
							{gameState.secretPrompt.split("").map((char, i) => {
								if (char === " ")
									return (
										<span key={i} className="mx-1">
											{" "}
										</span>
									);
								const isRevealed = gameState.revealedIndices.includes(i);
								return (
									<span
										key={i}
										className={
											isRevealed
												? "text-primary font-bold"
												: "text-muted-foreground"
										}
									>
										{isRevealed ? char : "_"}
									</span>
								);
							})}
						</span>
					</div>
				)}

				{/* Canvas Area - takes remaining space */}
				<div className="flex-1 min-h-0 overflow-hidden">
					{gameState.status === "idle" && (
						<DrawingCanvas onDrawingChange={setDrawingDataUrl} />
					)}

					{gameState.status === "generating" && (
						<div className="relative w-full h-full">
							{gameState.aiSvg ? (
								<div
									className="w-full h-full bg-white rounded-xl border-2 overflow-hidden shadow-xl [&>svg]:w-full [&>svg]:h-full"
									dangerouslySetInnerHTML={{ __html: gameState.aiSvg }}
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed">
									<div className="text-center space-y-2 sm:space-y-3">
										<Spinner className="size-8 sm:size-10 mx-auto" />
										<p className="text-sm sm:text-base text-muted-foreground">
											{currentDrawer?.name} is drawing...
										</p>
									</div>
								</div>
							)}
							<div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border shadow-sm">
								<div
									className="size-3 rounded-full animate-pulse"
									style={{ backgroundColor: currentDrawer?.color }}
								/>
								<span className="text-xs font-medium">
									{currentDrawer?.name}
								</span>
								<Spinner className="size-3" />
							</div>
						</div>
					)}

					{gameState.status === "playing" && (
						<div className="relative w-full h-full">
							{isHumanTurn ? (
								<DrawingCanvas onDrawingChange={setDrawingDataUrl} />
							) : gameState.aiSvg ? (
								<div
									className="w-full h-full bg-white rounded-xl border-2 overflow-hidden shadow-xl [&>svg]:w-full [&>svg]:h-full"
									dangerouslySetInnerHTML={{ __html: gameState.aiSvg }}
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed">
									<p className="text-sm sm:text-base text-muted-foreground">
										Waiting for drawing...
									</p>
								</div>
							)}

							{thinkingModelIds.length > 0 && (
								<div className="absolute top-3 right-3 flex -space-x-2">
									{thinkingModelIds.slice(0, 4).map((modelId) => {
										const model = selectedModels.find((m) => m.id === modelId);
										if (!model) return null;
										return (
											<div
												key={modelId}
												className="size-6 rounded-full border-2 border-background animate-pulse shadow-md"
												style={{ backgroundColor: model.color }}
												title={`${model.name} analyzing...`}
											/>
										);
									})}
								</div>
							)}
						</div>
					)}

					{gameState.status === "turn-ended" && (
						<div className="w-full h-full flex items-center justify-center">
							<div className="text-center space-y-4 sm:space-y-6 max-w-md px-4">
								{gameState.winner ? (
									<div className="space-y-2 sm:space-y-3">
										<div className="flex items-center justify-center gap-2 sm:gap-3">
											<Trophy className="size-6 sm:size-8 text-yellow-500" />
											<span className="text-xl sm:text-2xl font-bold">
												{gameState.winner.name} wins!
											</span>
										</div>
										<p className="text-sm sm:text-lg text-muted-foreground">
											The answer was:{" "}
											<span className="font-bold text-primary">
												{gameState.secretPrompt}
											</span>
										</p>
									</div>
								) : (
									<div className="space-y-2 sm:space-y-3">
										<div className="flex items-center justify-center gap-2">
											<Clock className="size-5 sm:size-6" />
											<span className="text-xl sm:text-2xl font-bold">
												Time's up!
											</span>
										</div>
										<p className="text-sm sm:text-lg text-muted-foreground">
											The answer was:{" "}
											<span className="font-bold text-primary">
												{gameState.secretPrompt}
											</span>
										</p>
									</div>
								)}
								<Button
									onClick={advanceToNextTurn}
									size="sm"
									className="sm:text-base px-6 sm:px-8"
								>
									{gameState.currentTurnIndex + 1 >= players.length &&
									gameState.currentRound >= TOTAL_ROUNDS ? (
										<>
											<Trophy className="size-4 sm:size-5" /> See Results
										</>
									) : (
										<>
											<ArrowRight className="size-4 sm:size-5" /> Next Turn
										</>
									)}
								</Button>
							</div>
						</div>
					)}

					{gameState.status === "game-over" && (
						<div className="w-full h-full flex items-center justify-center">
							<div className="text-center space-y-4 sm:space-y-6">
								<h2 className="text-2xl sm:text-3xl font-bold">Game Over!</h2>
								<Button
									size="sm"
									className="sm:text-base px-6 sm:px-8"
									onClick={startGame}
								>
									<Play className="size-4 sm:size-5" /> Play Again
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Guesses Panel - hidden on mobile, fixed width on desktop */}
			<div className="hidden lg:flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
				<div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
					<MessageCircle className="size-4 text-muted-foreground" />
					<span className="font-semibold">Guesses</span>
					{chatMessages.length > 0 && (
						<Badge variant="secondary" className="ml-auto">
							{chatMessages.length}
						</Badge>
					)}
				</div>

				<ScrollArea
					ref={chatContainerRef}
					className="flex-1 min-h-0"
				>
					<div className="p-3 space-y-2">
					{chatMessages.length === 0 ? (
						<div className="space-y-2">
							{gameState.status === "idle" ? (
								selectedModels.map((model) => {
									const style = getModelStyle(model);
									const styleInfo = MODEL_STYLE_INFO[style];
									return (
										<div
											key={model.id}
											className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50"
										>
											<div
												className="size-3 rounded-full"
												style={{ backgroundColor: model.color }}
											/>
											<span className="text-sm font-medium">{model.name}</span>
											<span className="ml-auto text-sm">{styleInfo.icon}</span>
										</div>
									);
								})
							) : gameState.status === "playing" ? (
								selectedModels
									.filter((m) => m.id !== currentDrawer?.id)
									.map((model) => (
										<div
											key={model.id}
											className={cn(
												"flex items-center gap-2 p-2.5 rounded-lg bg-muted/50",
												thinkingModelIds.includes(model.id) &&
													"animate-pulse bg-primary/10",
											)}
										>
											<div
												className="size-3 rounded-full"
												style={{ backgroundColor: model.color }}
											/>
											<span className="text-sm font-medium">{model.name}</span>
											<span className="ml-auto text-xs text-muted-foreground">
												{thinkingModelIds.includes(model.id)
													? "thinking..."
													: "watching"}
											</span>
											{thinkingModelIds.includes(model.id) && (
												<Spinner className="size-3" />
											)}
										</div>
									))
							) : (
								<p className="text-sm text-muted-foreground text-center py-8">
									{gameState.status === "generating"
										? "Waiting for drawing..."
										: "No guesses yet"}
								</p>
							)}
						</div>
					) : (
						[...chatMessages]
							.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
							.map((message) => (
								<div
									key={message.id}
									className={cn(
										"p-3 rounded-lg",
										message.isCorrect
											? "bg-green-500/20 border border-green-500/40"
											: message.similarity && message.similarity >= 0.6
												? "bg-yellow-500/15 border border-yellow-500/30"
												: "bg-muted/50",
									)}
								>
									<div className="flex items-center gap-2 mb-1">
										<div
											className="size-3 rounded-full shrink-0"
											style={{ backgroundColor: message.playerColor }}
										/>
										<span className="font-semibold text-sm">
											{message.playerName}
										</span>
										{message.similarity !== undefined && (
											<span
												className={cn(
													"ml-auto text-xs font-mono font-bold",
													message.isCorrect
														? "text-green-600"
														: message.similarity >= 0.6
															? "text-yellow-600"
															: "text-muted-foreground",
												)}
											>
												{Math.round(message.similarity * 100)}%
											</span>
										)}
									</div>
									<p
										className={cn(
											"text-sm",
											message.isCorrect && "text-green-600 font-semibold",
										)}
									>
										"{message.guess}"{" "}
										{message.isCorrect && <Check className="inline size-4" />}
									</p>
								</div>
							))
					)}
					</div>
				</ScrollArea>

				{!isHumanTurn && gameState.status === "playing" && (
					<div className="p-3 border-t">
						<div className="flex gap-2">
							<Input
								value={humanGuess}
								onChange={(e) => setHumanGuess(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && submitHumanGuess()}
								placeholder="Your guess..."
								className="text-sm"
							/>
							<Button size="icon" onClick={submitHumanGuess}>
								<Send className="size-4" />
							</Button>
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
		</div>
	);
}
