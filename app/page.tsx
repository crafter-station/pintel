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
      <SectionSeparator />

      <Tabs defaultValue="human-play" className="w-full space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          {gameModes.map((mode) => (
            <TabsTrigger key={mode.id} value={mode.id}>
              <mode.icon className="w-4 h-4 mr-2" />
              {mode.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="human-play"
          className="p-6 rounded-xl border"
        ></TabsContent>

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
