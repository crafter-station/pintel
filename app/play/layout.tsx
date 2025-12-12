import { GameTabsNav } from "@/components/game-tabs-nav";

export default function PlayLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="min-h-[100dvh] p-3 sm:p-4 md:p-6 lg:p-8">
			<div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
				<GameTabsNav />
				{children}
			</div>
		</main>
	);
}
