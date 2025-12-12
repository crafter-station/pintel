"use client";

import { Clock, MessageCircle, Play, RotateCcw, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getVisionModels, shuffleModels } from "@/lib/models";
import { cn } from "@/lib/utils";

interface GameState {
  status: "idle" | "playing" | "finished";
  timeRemaining: number;
  guessRound: number;
}

interface ChatMessage {
  id: string;
  modelId: string;
  modelName: string;
  modelColor: string;
  guess: string;
  timestamp: number;
  round: number;
}

export default function HumanPlayPage() {
  // Select 4 random vision models on mount
  const visionModels = useMemo(() => getVisionModels(), []);
  const selectedModels = useMemo(
    () => shuffleModels(visionModels, 4),
    [visionModels],
  );

  const [gameState, setGameState] = useState<GameState>({
    status: "idle",
    timeRemaining: 120,
    guessRound: 0,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string>("");
  const [isGuessing, setIsGuessing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastGuessTimeRef = useRef<number>(0);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Trigger guess from all models
  const triggerGuess = useCallback(
    async (round: number) => {
      if (!drawingDataUrl || isGuessing) return;

      setIsGuessing(true);

      try {
        const response = await fetch("/api/guess-drawing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: drawingDataUrl,
            models: selectedModels.map((m) => m.id),
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
                  const newMessage: ChatMessage = {
                    id: `${event.modelId}-${round}-${Date.now()}`,
                    modelId: event.modelId,
                    modelName: model.name,
                    modelColor: model.color,
                    guess: event.guess,
                    timestamp: Date.now(),
                    round,
                  };
                  setChatMessages((prev) => [...prev, newMessage]);
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
    [drawingDataUrl, selectedModels, isGuessing],
  );

  // Timer effect
  useEffect(() => {
    if (gameState.status !== "playing") return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        const newTime = prev.timeRemaining - 1;

        // Check if we should trigger a guess (every 10 seconds)
        const currentTenSecond = Math.floor((120 - newTime) / 10);
        const lastTenSecond = Math.floor((120 - prev.timeRemaining) / 10);

        if (currentTenSecond > lastTenSecond && newTime > 0) {
          // Trigger guess in next tick to avoid state update issues
          setTimeout(() => triggerGuess(currentTenSecond), 0);
        }

        if (newTime <= 0) {
          return {
            ...prev,
            timeRemaining: 0,
            status: "finished",
          };
        }

        return {
          ...prev,
          timeRemaining: newTime,
          guessRound: currentTenSecond,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, triggerGuess]);

  const startGame = () => {
    setChatMessages([]);
    setGameState({
      status: "playing",
      timeRemaining: 120,
      guessRound: 0,
    });
  };

  const resetGame = () => {
    setChatMessages([]);
    setDrawingDataUrl("");
    setGameState({
      status: "idle",
      timeRemaining: 120,
      guessRound: 0,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
      {/* Left Column - Players */}
      <Card className="w-full lg:w-56 shrink-0 h-fit">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Players
          </h3>

          {/* You - highlighted at top */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="size-3 rounded-full bg-primary ring-2 ring-primary/30" />
            <span className="text-sm font-medium text-primary">You</span>
            <User className="size-4 ml-auto text-primary" />
          </div>

          {/* AI Models */}
          <div className="space-y-2">
            {selectedModels.map((model) => (
              <div
                key={model.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-all",
                  isGuessing && "animate-pulse",
                )}
              >
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <span className="text-sm font-medium truncate">
                  {model.name}
                </span>
                {isGuessing && <Spinner className="size-3 ml-auto" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-0 h-fit">
        <CardContent className="p-6 flex flex-col items-center gap-6">
          {/* Timer */}
          <div className="flex items-center gap-4">
            <Badge
              variant={gameState.status === "playing" ? "default" : "secondary"}
              className="text-lg px-4 py-2"
            >
              <Clock className="size-4 mr-2" />
              {formatTime(gameState.timeRemaining)}
            </Badge>
            {gameState.status === "playing" && (
              <span className="text-sm text-muted-foreground">
                Next guess in {10 - (gameState.timeRemaining % 10)}s
              </span>
            )}
          </div>

          <DrawingCanvas
            onDrawingChange={setDrawingDataUrl}
            width={400}
            height={400}
            className="w-full max-w-md"
          />

          <div className="flex gap-4">
            {gameState.status === "idle" && (
              <Button size="lg" onClick={startGame}>
                <Play className="size-4 mr-2" />
                Start Drawing
              </Button>
            )}
            {gameState.status === "playing" && (
              <Button variant="outline" onClick={resetGame}>
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
            {gameState.status === "finished" && (
              <>
                <Button size="lg" onClick={startGame}>
                  <Play className="size-4 mr-2" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={resetGame}>
                  <RotateCcw className="size-4 mr-2" />
                  Reset
                </Button>
              </>
            )}
          </div>

          {gameState.status === "idle" && (
            <p className="text-sm text-muted-foreground text-center">
              Click "Start Drawing" to begin. AI models will guess what you're
              drawing every 10 seconds for 2 minutes.
            </p>
          )}
          {gameState.status === "finished" && (
            <p className="text-sm text-muted-foreground text-center">
              Time's up! Check the chat to see all the guesses.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="w-full lg:w-80 shrink-0 lg:h-full lg:max-h-[calc(100vh-12rem)] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <MessageCircle className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              AI Guesses
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
                    ? "Start drawing to see AI guesses"
                    : gameState.status === "playing"
                      ? "Waiting for first guess..."
                      : "No guesses yet"}
                </p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-background/50"
                >
                  <div
                    className="size-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: message.modelColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.modelName}
                    </span>
                    <p className="text-sm font-medium truncate">
                      "{message.guess}"
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
