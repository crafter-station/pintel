"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionDetail } from "@/lib/hooks/use-gallery";
import { getModelById } from "@/lib/models";
import { formatCost } from "@/lib/models";
import {
  ArrowLeft,
  Eye,
  Image,
  Bot,
  Trophy,
  Clock,
  DollarSign,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { DrawingReplay } from "@/components/drawing-replay";

export default function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item, isLoading, error } = useSessionDetail(id);

  const modeIcons = {
    human_judge: Eye,
    model_guess: Image,
    ai_duel: Bot,
  };

  const modeLabels = {
    human_judge: "Human Judge",
    model_guess: "Model Guess",
    ai_duel: "AI Duel",
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="aspect-square w-full" />
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="min-h-screen p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Link href="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
              Back to Gallery
            </Button>
          </Link>
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Session not found
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const Icon = modeIcons[item.mode];

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
              Back to Gallery
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-mono font-light">Session Details</h1>
            <p className="text-sm text-muted-foreground">
              {modeLabels[item.mode]}
            </p>
          </div>
          <div className="w-20" />
        </header>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-2 text-base px-4 py-2">
                <Icon className="size-4" />
                {modeLabels[item.mode]}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="size-4" />
                  {formatCost(item.totalCost)}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xl font-medium">&ldquo;{item.prompt}&rdquo;</p>
            </div>

            {item.mode === "human_judge" && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Drawings</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {item.drawings.map((drawing) => {
                    const model = getModelById(drawing.modelId);
                    const hasReplay = drawing.chunks && drawing.chunks.length > 0;
                    return (
                      <Card
                        key={drawing.id}
                        className={cn(
                          "overflow-hidden",
                          drawing.isWinner && "ring-2 ring-yellow-500"
                        )}
                      >
                        <CardContent className="p-2 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: model?.color }}
                            />
                            <span className="text-xs font-medium truncate flex-1">
                              {model?.name}
                            </span>
                            {drawing.isWinner && (
                              <Trophy className="size-3 text-yellow-500 shrink-0" />
                            )}
                          </div>
                          
                          <DrawingReplay
                            chunks={drawing.chunks || []}
                            finalSvg={drawing.svg}
                            autoPlay={!!hasReplay}
                            compact
                          />
                          
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            {drawing.generationTimeMs && (
                              <span>{(drawing.generationTimeMs / 1000).toFixed(1)}s</span>
                            )}
                            {drawing.cost && (
                              <span>{formatCost(drawing.cost)}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {item.mode === "model_guess" && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Guesses</h2>
                <div className="space-y-3">
                  {item.guesses.map((guess) => {
                    const model = getModelById(guess.modelId);
                    return (
                      <Card
                        key={guess.id}
                        className={cn(
                          guess.isCorrect && "ring-2 ring-green-500 bg-green-500/5"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: model?.color }}
                            />
                            <span className="font-medium flex-1">
                              {model?.name}
                            </span>
                            {guess.isCorrect ? (
                              <Badge className="bg-green-500 text-white">
                                <Check className="size-3 mr-1" />
                                Correct
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-500 border-red-500">
                                <X className="size-3 mr-1" />
                                Wrong
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-lg">&ldquo;{guess.guess}&rdquo;</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {item.mode === "ai_duel" && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Drawings & Guesses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.drawings.map((drawing) => {
                    const model = getModelById(drawing.modelId);
                    const hasReplay = drawing.chunks && drawing.chunks.length > 0;
                    const relatedGuesses = item.guesses.filter(
                      (g) => g.modelId !== drawing.modelId
                    );
                    return (
                      <Card key={drawing.id}>
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: model?.color }}
                            />
                            <span className="text-sm font-medium">{model?.name}</span>
                            <Badge variant="outline" className="text-xs">Drawer</Badge>
                          </div>
                          
                          <DrawingReplay
                            chunks={drawing.chunks || []}
                            finalSvg={drawing.svg}
                            autoPlay={!!hasReplay}
                            compact
                          />
                          
                          {relatedGuesses.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Guesses:
                              </p>
                              {relatedGuesses.map((guess) => {
                                const guessModel = getModelById(guess.modelId);
                                return (
                                  <div
                                    key={guess.id}
                                    className={cn(
                                      "flex items-center gap-1.5 p-1.5 rounded text-xs",
                                      guess.isCorrect && "bg-green-500/10"
                                    )}
                                  >
                                    <div
                                      className="size-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: guessModel?.color }}
                                    />
                                    <span className="truncate flex-1">
                                      {guessModel?.name}: &ldquo;{guess.guess}&rdquo;
                                    </span>
                                    {guess.isCorrect && (
                                      <Check className="size-3 text-green-500 shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
