import Link from "next/link";
import { GameModes } from "@/components/game-modes";
import { LogoAnimation } from "@/components/logo-animation";
import { Button } from "@/components/ui/button";
import { contentContainer } from "@/lib/grid-patterns";

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
			<section>
				<GameModes />
			</section>
		</div>
	);
}
