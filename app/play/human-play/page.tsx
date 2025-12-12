"use client";

import {
  Clock,
  MessageCircle,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Star,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getVisionModels, shuffleModels } from "@/lib/models";
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

function normalizeGuess(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "");
}

function checkCorrectGuess(guess: string, prompt: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(prompt);
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

export default function HumanPlayPage() {
  const visionModels = useMemo(() => getVisionModels(), []);
  const selectedModels = useMemo(
    () => shuffleModels(visionModels, 4),
    [visionModels],
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
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

    setTimeout(() => {
      advanceToNextTurn();
    }, 2500);
  }, []);

  // Advance to next turn
  const advanceToNextTurn = useCallback(() => {
    setGameState((prev) => {
      const nextTurnIndex = prev.currentTurnIndex + 1;
      const totalPlayers = players.length;

      if (nextTurnIndex >= totalPlayers) {
        const nextRound = prev.currentRound + 1;

        if (nextRound > TOTAL_ROUNDS) {
          return {
            ...prev,
            status: "game-over",
            winner: null,
          };
        }

        const newPrompt = getRandomPrompt();
        return {
          status: "idle",
          currentRound: nextRound,
          currentTurnIndex: 0,
          secretPrompt: newPrompt,
          hint: generateHint(newPrompt),
          revealedIndices: [],
          timeRemaining: TURN_DURATION,
          winner: null,
          aiSvg: null,
        };
      }

      const newPrompt = getRandomPrompt();
      return {
        status: "idle",
        currentRound: prev.currentRound,
        currentTurnIndex: nextTurnIndex,
        secretPrompt: newPrompt,
        hint: generateHint(newPrompt),
        revealedIndices: [],
        timeRemaining: TURN_DURATION,
        winner: null,
        aiSvg: null,
      };
    });

    setChatMessages([]);
    setDrawingDataUrl("");
    setHumanGuess("");
  }, [players.length]);

  const triggerAiGuess = useCallback(
    async (imageDataUrl: string) => {
      if (!imageDataUrl || isGuessing) return;

      setIsGuessing(true);

      const guessingModels = selectedModels.filter(
        (m) => m.id !== currentDrawer?.id,
      );

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
                  const isCorrect = checkCorrectGuess(
                    event.guess,
                    gameState.secretPrompt,
                  );

                  const newMessage: ChatMessage = {
                    id: `${event.modelId}-${Date.now()}`,
                    playerId: event.modelId,
                    playerName: model.name,
                    playerColor: model.color,
                    guess: event.guess,
                    timestamp: Date.now(),
                    isCorrect,
                  };

                  setChatMessages((prev) => [...prev, newMessage]);

                  if (isCorrect) {
                    const winnerPlayer = players.find(
                      (p) => p.id === event.modelId,
                    );
                    if (winnerPlayer) {
                      endTurn(winnerPlayer);
                    }
                  }
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
      }
    },
    [
      selectedModels,
      currentDrawer?.id,
      gameState.secretPrompt,
      isGuessing,
      players,
      endTurn,
    ],
  );

  const generateAiDrawing = useCallback(async () => {
    if (!currentDrawer || currentDrawer.isHuman) return;

    setGameState((prev) => ({ ...prev, status: "generating" }));

    try {
      const response = await fetch("/api/generate-drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: gameState.secretPrompt,
          models: [currentDrawer.id],
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

            if (event.type === "drawing" && event.svg) {
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
  }, [currentDrawer, gameState.secretPrompt, endTurn]);

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

      setTimeout(() => generateAiDrawing(), 100);
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

  const submitHumanGuess = () => {
    if (!humanGuess.trim() || isHumanTurn) return;

    const isCorrect = checkCorrectGuess(humanGuess, gameState.secretPrompt);

    const newMessage: ChatMessage = {
      id: `human-${Date.now()}`,
      playerId: "human",
      playerName: "You",
      playerColor: "hsl(var(--primary))",
      guess: humanGuess,
      timestamp: Date.now(),
      isCorrect,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setHumanGuess("");

    if (isCorrect) {
      const humanPlayer = players.find((p) => p.isHuman);
      if (humanPlayer) {
        endTurn(humanPlayer);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
      <Card className="w-full lg:w-56 shrink-0 h-fit">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Players
            </h3>
            <Badge variant="outline">
              Round {gameState.currentRound}/{TOTAL_ROUNDS}
            </Badge>
          </div>

          {players.map((player, index) => {
            const isCurrentDrawer = index === gameState.currentTurnIndex;
            const isDrawing =
              isCurrentDrawer &&
              (gameState.status === "playing" ||
                gameState.status === "generating");

            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  player.isHuman
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/50",
                  isCurrentDrawer && "ring-2 ring-primary",
                )}
              >
                {isDrawing ? (
                  <Pencil
                    className="size-4 shrink-0"
                    style={{ color: player.isHuman ? undefined : player.color }}
                  />
                ) : isCurrentDrawer ? (
                  <Star
                    className="size-4 shrink-0 fill-current"
                    style={{ color: player.isHuman ? undefined : player.color }}
                  />
                ) : (
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: player.isHuman
                        ? "hsl(var(--primary))"
                        : player.color,
                    }}
                  />
                )}
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    player.isHuman && "text-primary",
                  )}
                >
                  {player.name}
                </span>
                {player.isHuman && (
                  <User className="size-4 ml-auto text-primary" />
                )}
                {!player.isHuman && isGuessing && isCurrentDrawer && (
                  <Spinner className="size-3 ml-auto" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-0 h-fit">
        <CardContent className="p-6 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Badge
              variant={
                gameState.status === "playing" ||
                gameState.status === "generating"
                  ? "default"
                  : "secondary"
              }
              className="text-lg px-4 py-2"
            >
              <Clock className="size-4 mr-2" />
              {formatTime(gameState.timeRemaining)}
            </Badge>

            {gameState.status !== "idle" &&
              gameState.status !== "game-over" && (
                <div className="text-center">
                  {isHumanTurn && gameState.status === "playing" ? (
                    <span className="text-lg font-medium">
                      Draw:{" "}
                      <span className="text-primary">
                        {gameState.secretPrompt}
                      </span>
                    </span>
                  ) : (
                    <span className="text-lg font-mono tracking-widest">
                      {gameState.secretPrompt.split("").map((char, i) => {
                        if (char === " ") {
                          return (
                            <span key={i} className="mx-1">
                              {" "}
                            </span>
                          );
                        }
                        const isRevealed =
                          gameState.revealedIndices.includes(i);
                        return (
                          <span
                            key={i}
                            className={cn(
                              "mx-0.5",
                              isRevealed
                                ? "text-primary font-bold"
                                : "text-muted-foreground",
                            )}
                          >
                            {isRevealed ? char : "_"}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>
              )}

            {gameState.status === "idle" && (
              <Button size="lg" onClick={startTurn}>
                <Play className="size-4 mr-2" />
                {gameState.currentTurnIndex === 0 &&
                gameState.currentRound === 1
                  ? "Start Game"
                  : "Start Turn"}
              </Button>
            )}

            {gameState.status === "playing" && (
              <span className="text-sm text-muted-foreground">
                Next guess in {10 - (gameState.timeRemaining % 10)}s
              </span>
            )}
          </div>

          {gameState.status === "generating" ? (
            <div className="w-full max-w-md aspect-square flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
              <div className="text-center space-y-2">
                <Spinner className="size-8 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {currentDrawer?.name} is drawing...
                </p>
              </div>
            </div>
          ) : isHumanTurn || gameState.status === "idle" ? (
            <DrawingCanvas
              onDrawingChange={setDrawingDataUrl}
              width={400}
              height={400}
              className="w-full max-w-md"
            />
          ) : gameState.aiSvg ? (
            <div
              className="w-full max-w-md aspect-square bg-white rounded-lg border overflow-hidden"
              dangerouslySetInnerHTML={{ __html: gameState.aiSvg }}
            />
          ) : (
            <div className="w-full max-w-md aspect-square flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
              <p className="text-sm text-muted-foreground">
                Waiting for drawing...
              </p>
            </div>
          )}

          {gameState.status === "turn-ended" && (
            <div className="text-center space-y-2">
              {gameState.winner ? (
                <>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {gameState.winner.name} guessed it!
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    The answer was:{" "}
                    <span className="font-medium">
                      {gameState.secretPrompt}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Time's up!
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    The answer was:{" "}
                    <span className="font-medium">
                      {gameState.secretPrompt}
                    </span>
                  </p>
                </>
              )}
            </div>
          )}

          {gameState.status === "game-over" && (
            <div className="text-center space-y-4">
              <Badge variant="default" className="text-xl px-6 py-3">
                Game Over!
              </Badge>
              <Button size="lg" onClick={startGame}>
                <RotateCcw className="size-4 mr-2" />
                Play Again
              </Button>
            </div>
          )}

          {gameState.status === "idle" &&
            gameState.currentRound === 1 &&
            gameState.currentTurnIndex === 0 && (
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Take turns drawing! When it's your turn, draw the prompt. When
                AI models draw, try to guess what they're drawing. Each player
                has 2 minutes per turn.
              </p>
            )}
        </CardContent>
      </Card>

      {/* Right Column - Chat */}
      <Card className="w-full lg:w-80 shrink-0 lg:h-full lg:max-h-[calc(100vh-12rem)] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <MessageCircle className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Guesses
            </h3>
            {chatMessages.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {chatMessages.length}
              </Badge>
            )}
          </div>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-2 rounded-lg bg-muted/30 p-3 min-h-0"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {gameState.status === "idle"
                    ? "Start a turn to see guesses"
                    : gameState.status === "generating"
                      ? "Waiting for drawing..."
                      : "Waiting for guesses..."}
                </p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md",
                    message.isCorrect
                      ? "bg-green-500/20 border border-green-500/30"
                      : "bg-background/50",
                  )}
                >
                  <div
                    className="size-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: message.playerColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.playerName}
                    </span>
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        message.isCorrect && "text-green-600",
                      )}
                    >
                      "{message.guess}"{message.isCorrect && " ✓"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {!isHumanTurn && gameState.status === "playing" && (
            <div className="mt-4 flex gap-2 shrink-0">
              <Input
                value={humanGuess}
                onChange={(e) => setHumanGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitHumanGuess()}
                placeholder="Type your guess..."
                className="flex-1"
              />
              <Button size="icon" onClick={submitHumanGuess}>
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
