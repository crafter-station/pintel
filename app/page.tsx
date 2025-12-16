import { Brush, MessageCircle, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { GameModeCard } from "@/components/game-mode-card";
import { LogoAnimation } from "@/components/logo-animation";
import { Button } from "@/components/ui/button";
import { contentContainer } from "@/lib/grid-patterns";

const gameModes = [
  {
    id: "human-play",
    title: "Human Play",
    description: "Take turns drawing with AI. Guess each other's creations.",
    icon: User,
    href: "/play/human-play",
    available: true,
  },
  {
    id: "human-judge",
    title: "Human Judge",
    description: "AI models draw. You decide which captures the concept best.",
    icon: Brush,
    href: "/play/human-judge",
    available: true,
  },
  {
    id: "model-guess",
    title: "Model Guess",
    description: "You draw. AI models compete to guess what it is.",
    icon: MessageCircle,
    href: "/play/model-guess",
    available: true,
  },
  {
    id: "ai-duel",
    title: "AI Duel",
    description: "Watch AI models draw and guess each other's creations.",
    icon: Sparkles,
    href: "/play/ai-duel",
    available: true,
  },
];

export default function Home() {
  return (
    <div className={`${contentContainer} py-8 md:py-12`}>
      {/* Hero */}
      <header className="text-center space-y-6 mb-12">
        <div className="flex justify-center">
          <LogoAnimation className="w-48 md:w-64 h-auto" />
        </div>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto">
          A multimodal game where humans and AI try to understand each other's
          drawings.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/play/human-play">Start Playing</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/gallery">View Gallery</Link>
          </Button>
        </div>
      </header>

      {/* Game Modes */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-center">
          Game Modes
        </h2>
        <div className="grid gap-3">
          {gameModes.map((mode) => (
            <GameModeCard key={mode.id} mode={mode} />
          ))}
        </div>
      </section>

      <p className="mb-4 px-4 text-center font-mono text-sm text-balance text-muted-foreground mt-16">
        Powered by{" "}
        <a
          className="link"
          href="https://vercel.com/ai-gateway"
          target="_blank"
          rel="noopener"
        >
          Vercel AI Gateway
        </a>
      </p>

      <div className="px-4 flex mx-auto items-center gap-2 justify-center">
        <a
          className="text-center font-mono text-sm text-balance text-muted-foreground underline link"
          href="https://github.com/crafter-station/pintel"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          Source code
        </a>
      </div>
    </div>
  );
}
