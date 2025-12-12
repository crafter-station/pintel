"use client";

import { ArrowRight, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGallery } from "@/lib/hooks/use-gallery";
import { getModelById } from "@/lib/models";

function AnimatedDrawingCard({
	drawing,
	prompt,
	delay = 0,
}: {
	drawing: {
		svg: string;
		chunks?: string[] | null;
		modelId: string;
		isHumanDrawing?: boolean;
	};
	prompt: string;
	delay?: number;
}) {
	const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
	const [started, setStarted] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const chunks = drawing.chunks || [];
	const hasReplay = chunks.length > 0;
	const allFrames = hasReplay ? [...chunks, drawing.svg] : [drawing.svg];
	const currentSvg = allFrames[currentChunkIndex] || drawing.svg;
	const model = getModelById(drawing.modelId);
	const isHumanDrawing = drawing.isHumanDrawing || drawing.modelId === "human";
	const isImageDataUrl = currentSvg?.startsWith("data:image");

	useEffect(() => {
		const startTimer = setTimeout(() => {
			setStarted(true);
		}, delay);
		return () => clearTimeout(startTimer);
	}, [delay]);

	useEffect(() => {
		if (!started || !hasReplay) return;

		intervalRef.current = setInterval(() => {
			setCurrentChunkIndex((prev) => {
				if (prev >= allFrames.length - 1) {
					setTimeout(() => {
						setCurrentChunkIndex(0);
					}, 2000);
					return prev;
				}
				return prev + 1;
			});
		}, 50);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [started, hasReplay, allFrames.length]);

	return (
		<Card className="overflow-hidden group hover:shadow-lg transition-all">
			<CardContent className="p-0">
				<div className="aspect-square bg-white relative overflow-hidden">
					{isImageDataUrl ? (
						<img
							src={currentSvg}
							alt={prompt}
							className="w-full h-full object-contain"
						/>
					) : (
						<div
							className="w-full h-full"
							dangerouslySetInnerHTML={{ __html: currentSvg }}
						/>
					)}
					{isHumanDrawing ? (
						<div
							className="absolute top-2 right-2 size-5 rounded-full border-2 border-white shadow-sm bg-muted flex items-center justify-center"
							title="Player"
						>
							<User className="size-3 text-muted-foreground" />
						</div>
					) : model ? (
						<div
							className="absolute top-2 right-2 size-4 rounded-full border-2 border-white shadow-sm"
							style={{ backgroundColor: model.color }}
							title={model.name}
						/>
					) : null}
					{hasReplay && (
						<div className="absolute bottom-2 left-2 h-1 w-16 bg-black/20 rounded-full overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-75"
								style={{
									width: `${((currentChunkIndex + 1) / allFrames.length) * 100}%`,
								}}
							/>
						</div>
					)}
				</div>
				<div className="p-3 bg-gradient-to-t from-muted/50">
					<p className="text-sm font-medium line-clamp-1 text-center">
						&ldquo;{prompt}&rdquo;
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export function GameExamples() {
	const { data, isLoading } = useGallery("pictionary", 1, 6);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-center gap-2 text-muted-foreground">
					<Sparkles className="size-4" />
					<span className="text-sm font-medium">Recent Games</span>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{[...Array(3)].map((_, i) => (
						<Card key={i} className="overflow-hidden">
							<CardContent className="p-0">
								<div className="aspect-square bg-muted animate-pulse" />
								<div className="p-3">
									<div className="h-4 bg-muted rounded animate-pulse" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!data || data.items.length === 0) {
		return null;
	}

	const exampleItems = data.items
		.filter((item) => item.drawings.length > 0)
		.slice(0, 3);

	if (exampleItems.length === 0) return null;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-center gap-2 text-muted-foreground">
				<Sparkles className="size-4" />
				<span className="text-sm font-medium">Watch AI Draw Live</span>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				{exampleItems.map((item, idx) => {
					const drawing = item.drawings[0];
					if (!drawing) return null;
					return (
						<Link key={item.id} href={`/gallery/${item.id}`}>
							<AnimatedDrawingCard
								drawing={drawing}
								prompt={item.prompt}
								delay={idx * 500}
							/>
						</Link>
					);
				})}
			</div>
			<div className="flex justify-center">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/gallery">
						View all games
						<ArrowRight className="size-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
