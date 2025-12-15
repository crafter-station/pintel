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
			<header className="text-center space-y-6 mb-10">
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
				<div className="flex items-center gap-3">
					<div className="h-px flex-1 bg-border/50" />
					<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-center">
						Game Modes
					</h2>
					<div className="h-px flex-1 bg-border/50" />
				</div>
				<div className="grid gap-2">
					{gameModes.map((mode) => (
						<GameModeCard key={mode.id} mode={mode} />
					))}
				</div>
			</section>

			{/* Footer */}
			<footer className="mt-12 pt-6 border-t border-border/50 text-center space-y-4">
				<div className="flex items-center justify-center gap-4">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/leaderboard">Leaderboard</Link>
					</Button>
					<span className="text-muted-foreground/30">•</span>
					<Button variant="ghost" size="sm" asChild>
						<Link href="/gallery">Gallery</Link>
					</Button>
				</div>
				<p className="text-xs text-muted-foreground/60">
					Powered by{" "}
					<a
						href="https://vercel.com/ai-gateway"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-foreground transition-colors"
					>
						Vercel AI Gateway
					</a>
				</p>
			</footer>
		</div>
	);
}
