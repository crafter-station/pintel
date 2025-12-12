"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Image,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type GalleryItem,
  type GameMode,
  useGallery,
} from "@/lib/hooks/use-gallery";
import { formatCost, getModelById } from "@/lib/models";

export default function GalleryPage() {
  const [mode, setMode] = useState<GameMode | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useGallery(mode, page, pageSize);

  const handleModeChange = (value: string) => {
    setMode(value === "all" ? undefined : (value as GameMode));
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-mono font-light">Gallery</h1>
            <p className="text-sm text-muted-foreground">
              Explore all game results
            </p>
          </div>
          <div className="w-20" />
        </header>

        <Tabs value={mode || "all"} onValueChange={handleModeChange}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="human_judge">Human Judge</TabsTrigger>
            <TabsTrigger value="model_guess">Model Guess</TabsTrigger>
            <TabsTrigger value="ai_duel">AI Duel</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Failed to load gallery. Please try again.
            </CardContent>
          </Card>
        )}

        {data && data.items.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Image className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No results yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Play some games to see results here!
              </p>
            </CardContent>
          </Card>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.items.map((item) => (
                <GalleryCard key={item.id} item={item} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const modeIcons: Record<GameMode, typeof Eye> = {
    human_judge: Eye,
    model_guess: Image,
    ai_duel: Bot,
  };

  const modeLabels: Record<GameMode, string> = {
    human_judge: "Human Judge",
    model_guess: "Model Guess",
    ai_duel: "AI Duel",
  };

  const Icon = modeIcons[item.mode];

  const winnerDrawing = item.drawings.find((d: any) => d.isWinner);
  const displayDrawing = winnerDrawing || item.drawings[0];

  return (
    <Link href={`/gallery/${item.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
        <CardContent className="p-0">
          <div className="aspect-square bg-white relative overflow-hidden">
            {displayDrawing ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: displayDrawing.svg }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Image className="size-12 opacity-50" />
              </div>
            )}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="gap-1.5">
                <Icon className="size-3" />
                {modeLabels[item.mode]}
              </Badge>
            </div>
            {winnerDrawing && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-yellow-500 text-yellow-950">
                  <Trophy className="size-3" />
                  Winner
                </Badge>
              </div>
            )}
          </div>
          <div className="p-4 space-y-2">
            <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
              &ldquo;{item.prompt}&rdquo;
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="size-3" />
                {formatCost(item.totalCost)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {item.drawings.slice(0, 3).map((drawing: any) => {
                const model = getModelById(drawing.modelId);
                if (!model) return null;
                return (
                  <Badge
                    key={drawing.id}
                    variant="outline"
                    className="text-xs gap-1"
                  >
                    <div
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: model.color }}
                    />
                    {model.name}
                  </Badge>
                );
              })}
              {item.drawings.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.drawings.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
