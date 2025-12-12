"use client";

import { Brush, MessageCircle, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { GameModeCard } from "@/components/game-mode-card";
import { GithubLogoThemeAware } from "@/components/logos/github-theme-aware";
import { PintelLogoThemeAware } from "@/components/logos/pintel-theme-aware";
import { SectionSeparator } from "@/components/section-separator";
import { Button } from "@/components/ui/button";
import { contentContainer } from "@/lib/grid-patterns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const gameModes = [
  {
    id: "human-play",
    title: "Human Play",
    icon: User,
  },
  {
    id: "human-judge",
    title: "Human Judge",
    icon: Brush,
  },
  {
    id: "model-guess",
    title: "Model Guess",
    icon: MessageCircle,
  },
  {
    id: "ai-duel",
    title: "AI Duel",
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <div className={`${contentContainer} space-y-12 py-8`}>
      <header className="text-center space-y-4">
        <div className="flex justify-center">
          <PintelLogoThemeAware className="h-40 w-auto" />
        </div>
        <p className="text-muted-foreground font-mono text-sm tracking-widest">
          draw • guess • evaluate
        </p>
      </header>

      <SectionSeparator />

      <p className="text-center text-muted-foreground max-w-md mx-auto">
        A multimodal game where humans and AI models try to understand each
        other's drawings.
      </p>

      {/* ---- TABS ---- */}
      <Tabs defaultValue="human-play" className="w-full space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          {gameModes.map((mode) => (
            <TabsTrigger key={mode.id} value={mode.id}>
              <mode.icon className="w-4 h-4 mr-2" />
              {mode.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB 1: Human Play (vacío) */}
        <TabsContent value="human-play" className="p-6 rounded-xl border">
          {/* contenido vacío */}
        </TabsContent>

        {/* TAB 2: Human Judge */}
        <TabsContent value="human-judge" className="p-6 rounded-xl border">
          <GameModeCard
            mode={{
              id: "human-judge",
              title: "Human Judge",
              description:
                "AI models draw. You decide which captures the concept best.",
              icon: Brush,
              href: "/play/human-judge",
              available: true,
            }}
          />
        </TabsContent>

        {/* TAB 3: Model Guess */}
        <TabsContent value="model-guess" className="p-6 rounded-xl border">
          <GameModeCard
            mode={{
              id: "model-guess",
              title: "Model Guess",
              description: "You draw. AI models compete to guess what it is.",
              icon: MessageCircle,
              href: "/play/model-guess",
              available: true,
            }}
          />
        </TabsContent>

        {/* TAB 4: AI Duel */}
        <TabsContent value="ai-duel" className="p-6 rounded-xl border">
          <GameModeCard
            mode={{
              id: "ai-duel",
              title: "AI Duel",
              description:
                "Watch AI models draw and guess each other's creations.",
              icon: Sparkles,
              href: "/play/ai-duel",
              available: true,
            }}
          />
        </TabsContent>
      </Tabs>

      <SectionSeparator />

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/gallery">Gallery</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/leaderboard">Leaderboard</Link>
        </Button>
      </div>

      <SectionSeparator />

      <footer className="text-center space-y-4">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://vercel.com/ai-gateway"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-primary transition-colors underline underline-offset-4"
          >
            Vercel AI Gateway
          </a>
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://github.com/crafter-station/pintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
            aria-label="View on GitHub"
          >
            <GithubLogoThemeAware className="size-4" variant="invertocat" />
          </a>
        </Button>
      </footer>
    </div>
  );
}
