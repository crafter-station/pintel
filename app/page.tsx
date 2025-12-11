import { Brush, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { GameModeCard } from "@/components/game-mode-card";
import { GithubLogoThemeAware } from "@/components/logos/github-theme-aware";
import { PintelLogoThemeAware } from "@/components/logos/pintel-theme-aware";
import { SectionSeparator } from "@/components/section-separator";
import { Button } from "@/components/ui/button";
import { contentContainer } from "@/lib/grid-patterns";

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
		<div className={`${contentContainer} space-y-12 py-8`}>
			<header className="text-center space-y-4">
				<div className="flex justify-center">
					<PintelLogoThemeAware className="h-40 w-auto" />
				</div>
				<p className="text-muted-foreground font-mono text-sm tracking-widest">
					draw &bull; guess &bull; evaluate
				</p>
			</header>

			<SectionSeparator />

			<p className="text-center text-muted-foreground max-w-md mx-auto">
				A multimodal game where humans and AI models try to understand each
				other's drawings.
			</p>

			<div className="grid gap-4">
				{gameModes.map((mode) => (
					<GameModeCard key={mode.id} mode={mode} />
				))}
			</div>

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
