import { GameTabsNav } from "@/components/game-tabs-nav";

export default function PlayLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="min-h-screen p-6 md:p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<GameTabsNav />
				{children}
			</div>
		</main>
	);
}
