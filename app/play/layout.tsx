import { GameTabsNav } from "@/components/game-tabs-nav";
import { Toaster } from "@/components/ui/sonner";

export default function PlayLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="min-h-[calc(100dvh-3.5rem)] p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">
				<GameTabsNav />
				<div className="min-h-0">{children}</div>
			</div>
			<Toaster position="top-center" />
		</main>
	);
}
