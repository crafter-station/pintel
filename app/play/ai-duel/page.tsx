"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getRandomPrompt } from "@/lib/prompts";
import {
  getModelById,
  formatCost,
  getVisionModels,
  DEFAULT_VISION_MODELS,
  shuffleModels,
  type ModelConfig,
} from "@/lib/models";
import {
  ArrowLeft,
  Play,
  Trophy,
  Clock,
  Check,
  RotateCcw,
  Sparkles,
  DollarSign,
  Coins,
  Shuffle,
  Pause,
  FastForward,
  X,
  Eye,
  Pencil,
  Zap,
  Bot,
} from "lucide-react";

interface DuelState {
  status: "setup" | "running" | "paused" | "round-end" | "finished";
  selectedModels: string[];
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
  speed: "normal" | "fast" | "instant";
}

interface RoundResult {
  drawer: string;
  prompt: string;
  svg: string;
  guesses: Record<string, { guess: string; isCorrect: boolean }>;
  winner: string | null;
}

export default function AIDuelPage() {
  const [state, setState] = useState<DuelState>({
    status: "setup",
    selectedModels: DEFAULT_VISION_MODELS,
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
    speed: "normal",
  });

  const [phaseStatus, setPhaseStatus] = useState<"idle" | "drawing" | "guessing" | "scoring">("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const visionModels = useMemo(() => getVisionModels(), []);

  // Timer
  useEffect(() => {
    if (phaseStatus !== "idle") {
      startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
      startTimeRef.current = null;
    }
  }, [phaseStatus]);

  // Cleanup autoplay on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, []);

  const toggleModel = useCallback((modelId: string) => {
    setState((prev) => ({
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
    setState((prev) => ({
      ...prev,
      selectedModels: shuffled.map((m) => m.id),
    }));
  }, [visionModels]);

  // Convert SVG to PNG data URL for vision models
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
    setState((prev) => ({
      ...prev,
      autoPlay: !prev.autoPlay,
    }));
  }, []);

  const startDuel = useCallback(() => {
    if (state.selectedModels.length < 3) return;

    // Initialize leaderboard
    const initialLeaderboard: DuelState["leaderboard"] = {};
    state.selectedModels.forEach((id) => {
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

    // Start first round
    runRound(state.selectedModels[0], state.selectedModels, initialLeaderboard, 1);
  }, [state.selectedModels, runRound]);

  const runRound = useCallback(async (
    drawerId: string,
    models: string[],
    leaderboard: DuelState["leaderboard"],
    roundNum: number
  ) => {
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

    // Phase 1: Drawing
    try {
      const drawResponse = await fetch("/api/generate-drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, models: [drawerId] }),
      });

      if (!drawResponse.ok) throw new Error("Drawing failed");

      const reader = drawResponse.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalSvg = "";
      let drawCost = 0;
      let drawTokens = 0;

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

      // Update drawer stats
      const newLeaderboard = { ...leaderboard };
      newLeaderboard[drawerId].draws += 1;

      setState((prev) => ({
        ...prev,
        leaderboard: newLeaderboard,
        totalCost: prev.totalCost + drawCost,
        totalTokens: prev.totalTokens + drawTokens,
      }));

      // Phase 2: Guessing
      setPhaseStatus("guessing");

      // Convert SVG to PNG for vision models
      console.log("[AI Duel] Converting SVG to PNG...");
      const pngDataUrl = await svgToPng(finalSvg);
      console.log("[AI Duel] PNG ready, sending to vision models...");

      const guessResponse = await fetch("/api/guess-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: pngDataUrl, models: guessers }),
      });

      if (!guessResponse.ok) throw new Error("Guessing failed");

      const guessReader = guessResponse.body?.getReader();
      if (!guessReader) throw new Error("No response body");

      let guessBuffer = "";
      const roundGuesses: Record<string, { guess: string; isCorrect: boolean; timeMs: number }> = {};
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
            console.log("[AI Duel] Guess event:", event.type, event.modelId, event.guess?.substring(0, 50));

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
              console.log("[AI Duel] Final guess:", event.modelId, "->", event.guess, "correct:", isCorrect);
              roundGuesses[event.modelId] = {
                guess: event.guess,
                isCorrect,
                timeMs: event.generationTimeMs,
              };
              setState((prev) => ({
                ...prev,
                guesses: {
                  ...prev.guesses,
                  [event.modelId]: { guess: event.guess, isCorrect, timeMs: event.generationTimeMs },
                },
              }));
            } else if (event.type === "error") {
              console.error("[AI Duel] Guess error:", event.modelId, event.error);
            } else if (event.type === "complete") {
              guessCost = event.totalCost || 0;
              guessTokens = event.totalTokens || 0;
            }
          } catch (e) {
            console.error("[AI Duel] Parse error:", e);
          }
        }
      }

      // Phase 3: Scoring
      setPhaseStatus("scoring");

      // Find first correct guesser (by time)
      const correctGuessers = Object.entries(roundGuesses)
        .filter(([, g]) => g.isCorrect)
        .sort(([, a], [, b]) => a.timeMs - b.timeMs);

      const winner = correctGuessers.length > 0 ? correctGuessers[0][0] : null;

      // Update leaderboard
      const finalLeaderboard = { ...newLeaderboard };
      correctGuessers.forEach(([modelId], index) => {
        finalLeaderboard[modelId].correctGuesses += 1;
        // First correct gets 3 points, others get 1
        finalLeaderboard[modelId].points += index === 0 ? 3 : 1;
      });
      // Drawer gets 1 point if no one guessed correctly
      if (!winner) {
        finalLeaderboard[drawerId].points += 1;
      }

      const roundResult: RoundResult = {
        drawer: drawerId,
        prompt,
        svg: finalSvg,
        guesses: Object.fromEntries(
          Object.entries(roundGuesses).map(([k, v]) => [k, { guess: v.guess, isCorrect: v.isCorrect }])
        ),
        winner,
      };

      setState((prev) => ({
        ...prev,
        leaderboard: finalLeaderboard,
        totalCost: prev.totalCost + guessCost,
        totalTokens: prev.totalTokens + guessTokens,
        roundHistory: [...prev.roundHistory, roundResult],
        status: roundNum >= prev.totalRounds ? "finished" : "round-end",
      }));

      setPhaseStatus("idle");

      // Auto-advance to next round (check current autoPlay state)
      setState((prev) => {
        if (roundNum < prev.totalRounds && prev.autoPlay) {
          const delay = prev.speed === "instant" ? 500 : prev.speed === "fast" ? 1500 : 3000;
          autoPlayRef.current = setTimeout(() => {
            const nextDrawerIndex = (models.indexOf(drawerId) + 1) % models.length;
            const nextDrawer = models[nextDrawerIndex];
            setState((s) => ({ ...s, currentRound: roundNum + 1, status: "running" }));
            runRound(nextDrawer, models, finalLeaderboard, roundNum + 1);
          }, delay);
        }
        return prev;
      });
    } catch (error) {
      console.error("Round error:", error);
      setPhaseStatus("idle");
      setState((prev) => ({ ...prev, status: "paused" }));
    }
  }, [state.totalRounds, state.autoPlay, state.speed, svgToPng]);

  const continueToNextRound = useCallback(() => {
    const nextDrawerIndex = (state.selectedModels.indexOf(state.currentDrawer!) + 1) % state.selectedModels.length;
    const nextDrawer = state.selectedModels[nextDrawerIndex];
    setState((prev) => ({ ...prev, currentRound: prev.currentRound + 1, status: "running" }));
    runRound(nextDrawer, state.selectedModels, state.leaderboard, state.currentRound + 1);
  }, [state.selectedModels, state.currentDrawer, state.leaderboard, state.currentRound, runRound]);

  const checkGuess = (guess: string, prompt: string): boolean => {
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedPrompt = prompt.toLowerCase().trim();
    if (normalizedGuess.includes(normalizedPrompt) || normalizedPrompt.includes(normalizedGuess)) {
      return true;
    }
    const promptWords = normalizedPrompt.split(/\s+/);
    const guessWords = normalizedGuess.split(/\s+/);
    const significantWords = promptWords.filter((w) => w.length > 2);
    return significantWords.some((word) =>
      guessWords.some((gw) => gw.includes(word) || word.includes(gw))
    );
  };

  const sortedLeaderboard = useMemo(() => {
    return Object.entries(state.leaderboard)
      .map(([modelId, stats]) => ({ modelId, ...stats }))
      .sort((a, b) => b.points - a.points);
  }, [state.leaderboard]);

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
              <h1 className="text-2xl font-mono font-light">AI Duel</h1>
              <p className="text-sm text-muted-foreground">
                Watch AI compete
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <DollarSign className="size-3" />
                    {formatCost(state.totalCost)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total cost</p>
                  <p className="text-xs text-muted-foreground">
                    {state.totalTokens.toLocaleString()} tokens
                  </p>
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline">
                <Trophy className="size-3" />
                {state.currentRound}/{state.totalRounds}
              </Badge>
            </div>
          </header>

          {/* Setup */}
          {state.status === "setup" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Bot className="size-12 mx-auto text-primary" />
                <h2 className="text-2xl font-light">AI Duel Arena</h2>
                <p className="text-muted-foreground">
                  Select 3-6 AI models to compete. They'll take turns drawing and guessing.
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {visionModels.map((model) => {
                      const isSelected = state.selectedModels.includes(model.id);
                      const isDisabled = !isSelected && state.selectedModels.length >= 6;
                      return (
                        <button
                          key={model.id}
                          onClick={() => !isDisabled && toggleModel(model.id)}
                          disabled={isDisabled}
                          className={cn(
                            "group relative p-4 rounded-lg text-left transition-all border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : isDisabled
                              ? "opacity-30 cursor-not-allowed border-border"
                              : "hover:bg-muted border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: model.color }}
                            />
                            <span className="text-sm font-medium truncate">
                              {model.name}
                            </span>
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
                  onClick={startDuel}
                  disabled={state.selectedModels.length < 3}
                >
                  <Zap className="size-4" />
                  {state.selectedModels.length < 3
                    ? "Select 3+ models"
                    : "Start Duel"
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Running / Round End */}
          {(state.status === "running" || state.status === "round-end" || state.status === "paused") && (
            <div className="space-y-6">
              {/* Round Info + Controls */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Badge variant="secondary" className="text-lg px-6 py-2">
                    Round {state.currentRound}/{state.totalRounds}
                  </Badge>
                  {phaseStatus !== "idle" && (
                    <Badge variant="outline" className="animate-pulse">
                      <Clock className="size-3 mr-1" />
                      {elapsedTime}s
                    </Badge>
                  )}
                  <Button
                    variant={state.autoPlay ? "outline" : "default"}
                    size="sm"
                    onClick={togglePause}
                  >
                    {state.autoPlay ? (
                      <>
                        <Pause className="size-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="size-4 mr-1" />
                        Auto
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-xl">
                  {phaseStatus === "drawing" && (
                    <span className="text-blue-500">
                      <Pencil className="size-5 inline mr-2" />
                      {getModelById(state.currentDrawer!)?.name} is drawing...
                    </span>
                  )}
                  {phaseStatus === "guessing" && (
                    <span className="text-purple-500">
                      <Eye className="size-5 inline mr-2" />
                      Models are guessing...
                    </span>
                  )}
                  {phaseStatus === "scoring" && (
                    <span className="text-yellow-500">
                      <Trophy className="size-5 inline mr-2" />
                      Scoring...
                    </span>
                  )}
                  {state.status === "round-end" && (
                    <span className="text-green-500">Round Complete!</span>
                  )}
                </div>
                {state.currentPrompt && (
                  <Badge variant="outline" className="text-base px-4 py-1">
                    &ldquo;{state.currentPrompt}&rdquo;
                  </Badge>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Drawing Area */}
                <Card className="overflow-hidden">
                  <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                    <Pencil className="size-4" />
                    <span className="font-medium">Drawing</span>
                    {state.currentDrawer && (
                      <Badge variant="outline" className="ml-auto">
                        {getModelById(state.currentDrawer)?.name}
                      </Badge>
                    )}
                  </div>
                  <div className="aspect-square bg-white flex items-center justify-center">
                    {state.currentSvg ? (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: state.currentSvg }}
                      />
                    ) : (
                      <Spinner className="size-8" />
                    )}
                  </div>
                </Card>

                {/* Guesses */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="size-4" />
                    <span>Guesses</span>
                    <span className="ml-auto">
                      {Object.keys(state.guesses).length}/{state.selectedModels.length - 1}
                    </span>
                  </div>
                  {state.selectedModels
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
                            !guess && phaseStatus === "guessing" && "opacity-60"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "size-3 rounded-full shrink-0",
                                  !guess && phaseStatus === "guessing" && "animate-pulse"
                                )}
                                style={{ backgroundColor: model.color }}
                              />
                              <span className="font-medium">{model.name}</span>
                              <div className="flex-1" />
                              {!guess && phaseStatus === "guessing" && (
                                <Badge variant="outline" className="text-xs">
                                  <Spinner className="size-3 mr-1" />
                                  thinking...
                                </Badge>
                              )}
                              {guess?.isCorrect && (
                                <Badge className="bg-green-500 text-white">
                                  <Check className="size-3 mr-1" />
                                  Correct!
                                </Badge>
                              )}
                              {guess && !guess.isCorrect && state.status === "round-end" && (
                                <Badge variant="outline" className="text-red-500 border-red-500">
                                  <X className="size-3 mr-1" />
                                  Wrong
                                </Badge>
                              )}
                              {guess?.timeMs && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {(guess.timeMs / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {/* Guess text - always show prominently */}
                            <div className={cn(
                              "mt-3 p-3 rounded-lg bg-muted/50 text-center",
                              guess?.isCorrect && "bg-green-500/10"
                            )}>
                              {guess ? (
                                <span className={cn(
                                  "text-xl font-medium",
                                  guess.isCorrect ? "text-green-500" : "text-foreground"
                                )}>
                                  &ldquo;{guess.guess}&rdquo;
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  Waiting for guess...
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>

              {/* Leaderboard */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Trophy className="size-4 text-yellow-500" />
                    <span className="font-medium">Leaderboard</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sortedLeaderboard.map((entry, index) => {
                      const model = getModelById(entry.modelId);
                      if (!model) return null;
                      return (
                        <div
                          key={entry.modelId}
                          className={cn(
                            "p-3 rounded-lg border",
                            index === 0 && entry.points > 0 && "bg-yellow-500/10 border-yellow-500/50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">#{index + 1}</span>
                            <div
                              className="size-2 rounded-full"
                              style={{ backgroundColor: model.color }}
                            />
                            <span className="text-sm font-medium truncate">{model.name}</span>
                          </div>
                          <div className="text-2xl font-bold">{entry.points}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.correctGuesses} correct
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Controls */}
              {state.status === "round-end" && state.currentRound < state.totalRounds && !state.autoPlay && (
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={togglePause}>
                    <Play className="size-4" />
                    Enable Auto
                  </Button>
                  <Button size="lg" onClick={continueToNextRound}>
                    <FastForward className="size-4" />
                    Next Round
                  </Button>
                </div>
              )}
              {state.status === "round-end" && state.currentRound < state.totalRounds && state.autoPlay && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="animate-pulse px-4 py-2">
                    <Clock className="size-4 mr-2" />
                    Next round starting...
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Finished */}
          {state.status === "finished" && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <Trophy className="size-16 mx-auto text-yellow-500" />
                <h2 className="text-3xl font-light">Duel Complete!</h2>
                <p className="text-muted-foreground">
                  {state.totalRounds} rounds played
                </p>
              </div>

              {/* Winner */}
              {sortedLeaderboard[0] && (
                <Card className="bg-yellow-500/10 border-yellow-500/50">
                  <CardContent className="p-6 text-center">
                    <div
                      className="size-6 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: getModelById(sortedLeaderboard[0].modelId)?.color }}
                    />
                    <h3 className="text-2xl font-bold">
                      {getModelById(sortedLeaderboard[0].modelId)?.name}
                    </h3>
                    <p className="text-yellow-600">Champion with {sortedLeaderboard[0].points} points</p>
                  </CardContent>
                </Card>
              )}

              {/* Final Leaderboard */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Final Standings</h3>
                  <div className="space-y-3">
                    {sortedLeaderboard.map((entry, index) => {
                      const model = getModelById(entry.modelId);
                      if (!model) return null;
                      const percentage = state.totalRounds > 0
                        ? (entry.correctGuesses / (state.totalRounds - entry.draws)) * 100
                        : 0;

                      return (
                        <div key={entry.modelId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "w-6 text-center font-mono",
                                index === 0 && "text-yellow-500 font-bold"
                              )}>
                                {index + 1}
                              </span>
                              <div
                                className="size-3 rounded-full"
                                style={{ backgroundColor: model.color }}
                              />
                              <span className="font-medium">{model.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold">{entry.points} pts</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({entry.correctGuesses} correct, {entry.draws} draws)
                              </span>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Coins className="size-4" />
                  <span>Total: {formatCost(state.totalCost)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="size-4" />
                  <span>{state.totalTokens.toLocaleString()} tokens</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setState((prev) => ({ ...prev, status: "setup" }))}
                >
                  Change Models
                </Button>
                <Button size="lg" onClick={() => window.location.reload()}>
                  <RotateCcw className="size-4" />
                  New Duel
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}
