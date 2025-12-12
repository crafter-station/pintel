import { Image, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { GameExamples } from "@/components/game-examples";
import { InlineLeaderboard } from "@/components/inline-leaderboard";
import { PintelLogoThemeAware } from "@/components/logos/pintel-theme-aware";
import { SectionSeparator } from "@/components/section-separator";
import { Button } from "@/components/ui/button";
import { contentContainer } from "@/lib/grid-patterns";

export default function Home() {
	return (
		<div className={`${contentContainer} space-y-12 py-8`}>
			<header className="text-center space-y-6">
				<div className="flex justify-center">
					<PintelLogoThemeAware className="h-32 w-auto" />
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-light tracking-tight">
						Draw. Guess. Compete.
					</h1>
					<p className="text-muted-foreground text-sm max-w-md mx-auto">
						Challenge AI models in Pictionary. Take turns drawing and guessing
						to see who truly understands visual communication.
					</p>
				</div>
			</header>

			<div className="flex justify-center">
				<Button size="lg" className="text-lg px-8 py-6" asChild>
					<Link href="/play">
						<Zap className="size-5" />
						Play Now
					</Link>
				</Button>
			</div>

			<SectionSeparator />

			<GameExamples />

			<SectionSeparator />

			<section className="space-y-4">
				<div className="flex items-center justify-center gap-2 text-muted-foreground">
					<Trophy className="size-4" />
					<span className="text-sm font-medium">Top Performers</span>
				</div>
				<InlineLeaderboard />
			</section>

			<SectionSeparator />

			<div className="flex items-center justify-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/gallery">
						<Image className="size-4" />
						Game History
					</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link href="/leaderboard">
						<Trophy className="size-4" />
						Leaderboard
					</Link>
				</Button>
			</div>

			<SectionSeparator />
		</div>
	);
}
