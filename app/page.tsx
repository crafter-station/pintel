import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brush, MessageCircle, Sparkles, ArrowRight } from "lucide-react";

const gameModes = [
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
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-12">
        {/* Logo */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-mono font-light tracking-tight">
            pintel
          </h1>
          <p className="text-muted-foreground font-mono text-sm tracking-widest">
            draw &bull; guess &bull; evaluate
          </p>
        </header>

        {/* Description */}
        <p className="text-center text-muted-foreground max-w-md mx-auto">
          A multimodal game where humans and AI models try to understand each
          other's drawings.
        </p>

        {/* Game modes */}
        <div className="grid gap-4">
          {gameModes.map((mode) => {
            const Icon = mode.icon;

            return (
              <Link
                key={mode.id}
                href={mode.available ? mode.href : "#"}
                className={cn(!mode.available && "pointer-events-none")}
              >
                <Card
                  className={cn(
                    "group transition-all duration-300",
                    mode.available
                      ? "hover:border-primary/50 hover:bg-card/80 cursor-pointer"
                      : "opacity-50"
                  )}
                >
                  <CardContent className="flex items-start gap-4 py-6">
                    <div
                      className={cn(
                        "p-3 rounded-lg transition-colors",
                        mode.available
                          ? "bg-primary/10 text-primary group-hover:bg-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-medium">{mode.title}</h2>
                        {!mode.available && (
                          <Badge variant="outline" className="text-xs">
                            Coming soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                    </div>
                    {mode.available && (
                      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Navigation Links */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/gallery">Gallery</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
        </div>

        {/* Footer */}
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
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </footer>
      </div>
    </main>
  );
}
