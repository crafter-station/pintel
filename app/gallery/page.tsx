"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Clock,
	DollarSign,
	Image,
	LayoutGrid,
	List,
	Search,
	Trophy,
	User,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type GalleryItem, useGallery } from "@/lib/hooks/use-gallery";
import { formatCost, getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const pageSize = 20;

	const { data, isLoading, error } = useGallery("pictionary", page, pageSize);

	const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

	const filteredItems = data?.items.filter((item) =>
		searchQuery
			? item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
			: true,
	);

	return (
		<main className="min-h-screen p-6 md:p-8">
			<div className="max-w-7xl mx-auto space-y-8">
				<header className="flex items-center justify-between">
					<Link href="/">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="size-4" />
							Back
						</Button>
					</Link>
					<div className="text-center">
						<h1 className="text-3xl font-mono font-light">Game History</h1>
						<p className="text-sm text-muted-foreground">
							Browse past games and results
						</p>
					</div>
					<div className="w-20" />
				</header>

				{data && data.total > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<Card>
							<CardContent className="p-4 text-center">
								<div className="text-2xl font-bold">{data.total}</div>
								<div className="text-xs text-muted-foreground">Total Games</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-center">
								<div className="text-2xl font-bold">
									{data.items.reduce((sum, i) => sum + i.drawings.length, 0)}
								</div>
								<div className="text-xs text-muted-foreground">
									Drawings Created
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-center">
								<div className="text-2xl font-bold">
									{data.items.reduce((sum, i) => sum + i.guesses.length, 0)}
								</div>
								<div className="text-xs text-muted-foreground">
									Guesses Made
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-center">
								<div className="text-2xl font-bold">
									{formatCost(
										data.items.reduce((sum, i) => sum + i.totalCost, 0),
									)}
								</div>
								<div className="text-xs text-muted-foreground">Total Cost</div>
							</CardContent>
						</Card>
					</div>
				)}

				<div className="flex flex-col md:flex-row gap-4 items-center justify-end">
					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by prompt..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 w-64"
							/>
						</div>
						<div className="flex border rounded-md">
							<Button
								variant={viewMode === "grid" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setViewMode("grid")}
								className="rounded-r-none"
							>
								<LayoutGrid className="size-4" />
							</Button>
							<Button
								variant={viewMode === "list" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setViewMode("list")}
								className="rounded-l-none"
							>
								<List className="size-4" />
							</Button>
						</div>
					</div>
				</div>

				{isLoading && (
					<div
						className={cn(
							viewMode === "grid"
								? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
								: "space-y-4",
						)}
					>
						{[...Array(6)].map((_, i) => (
							<Card key={i}>
								<CardContent className="p-0">
									{viewMode === "grid" ? (
										<>
											<Skeleton className="aspect-square w-full" />
											<div className="p-4 space-y-2">
												<Skeleton className="h-4 w-3/4" />
												<Skeleton className="h-3 w-1/2" />
											</div>
										</>
									) : (
										<div className="flex gap-4 p-4">
											<Skeleton className="size-20 rounded" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-3/4" />
												<Skeleton className="h-3 w-1/2" />
											</div>
										</div>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{error && (
					<Card>
						<CardContent className="p-6 text-center text-muted-foreground">
							Failed to load game history. Please try again.
						</CardContent>
					</Card>
				)}

				{data && filteredItems && filteredItems.length === 0 && (
					<Card>
						<CardContent className="p-12 text-center">
							<Image className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
							<p className="text-muted-foreground">
								{searchQuery ? "No games match your search" : "No games yet"}
							</p>
							<p className="text-sm text-muted-foreground mt-2">
								{searchQuery
									? "Try a different search term"
									: "Play your first game to see it here!"}
							</p>
							{!searchQuery && (
								<Button asChild className="mt-4">
									<Link href="/play">
										<Zap className="size-4" />
										Start Playing
									</Link>
								</Button>
							)}
						</CardContent>
					</Card>
				)}

				{data && filteredItems && filteredItems.length > 0 && (
					<>
						{viewMode === "grid" ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{filteredItems.map((item) => (
									<GalleryCard key={item.id} item={item} />
								))}
							</div>
						) : (
							<div className="space-y-3">
								{filteredItems.map((item) => (
									<GalleryListItem key={item.id} item={item} />
								))}
							</div>
						)}

						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-4">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									<ChevronLeft className="size-4" />
									Previous
								</Button>
								<span className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page >= totalPages}
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</main>
	);
}

function GalleryCard({ item }: { item: GalleryItem }) {
	const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
	const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const currentDrawing = item.drawings[currentDrawingIndex];
	const chunks = currentDrawing?.chunks || [];
	const hasReplay = chunks.length > 0;

	const allFrames = hasReplay
		? [...chunks, currentDrawing?.svg || ""]
		: [currentDrawing?.svg || ""];

	const currentSvg = allFrames[currentChunkIndex] || currentDrawing?.svg || "";

	useEffect(() => {
		if (!hasReplay) return;

		intervalRef.current = setInterval(() => {
			setCurrentChunkIndex((prev) => {
				if (prev >= allFrames.length - 1) {
					setTimeout(() => {
						setCurrentDrawingIndex((di) => (di + 1) % item.drawings.length);
						setCurrentChunkIndex(0);
					}, 1000);
					return prev;
				}
				return prev + 1;
			});
		}, 60);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [hasReplay, allFrames.length, item.drawings.length, currentDrawingIndex]);

	useEffect(() => {
		setCurrentChunkIndex(0);
	}, [currentDrawingIndex]);

	const winnerDrawing = item.drawings.find((d) => d.isWinner);
	const correctGuesses = item.guesses.filter((g) => g.isCorrect).length;
	const isImageDataUrl = currentSvg.startsWith("data:image");
	const isHumanDrawing = currentDrawing?.isHumanDrawing;

	return (
		<Link href={`/gallery/${item.id}`}>
			<Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden">
				<CardContent className="p-0">
					<div className="aspect-square bg-white relative overflow-hidden">
						{currentDrawing ? (
							isImageDataUrl ? (
								<img
									src={currentSvg}
									alt={item.prompt}
									className="w-full h-full object-contain"
								/>
							) : (
								<div
									className="w-full h-full"
									dangerouslySetInnerHTML={{ __html: currentSvg }}
								/>
							)
						) : (
							<div className="w-full h-full flex items-center justify-center text-muted-foreground">
								<Image className="size-12 opacity-50" />
							</div>
						)}
						{item.drawings.length > 1 && (
							<div className="absolute top-2 left-2 flex gap-1">
								{item.drawings.map((_, idx) => (
									<div
										key={idx}
										className={cn(
											"size-2 rounded-full transition-all",
											idx === currentDrawingIndex
												? "bg-white scale-125"
												: "bg-white/50",
										)}
									/>
								))}
							</div>
						)}
						{winnerDrawing && (
							<div className="absolute top-2 right-2">
								<Badge className="bg-yellow-500 text-yellow-950">
									<Trophy className="size-3" />
								</Badge>
							</div>
						)}
						{hasReplay && (
							<div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
								<Zap className="size-3 inline mr-1" />
								{currentChunkIndex + 1}/{allFrames.length}
							</div>
						)}
						<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8">
							<p className="text-white font-medium line-clamp-1">
								&ldquo;{item.prompt}&rdquo;
							</p>
						</div>
					</div>
					<div className="p-4 space-y-3">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								{item.playerName && (
									<>
										<User className="size-3" />
										<span className="mr-2">{item.playerName}</span>
									</>
								)}
								<Clock className="size-3" />
								{formatDistanceToNow(new Date(item.createdAt), {
									addSuffix: true,
								})}
							</div>
							<div className="flex items-center gap-3">
								{correctGuesses > 0 && (
									<span className="text-green-600">
										{correctGuesses} correct
									</span>
								)}
								<div className="flex items-center gap-1">
									<DollarSign className="size-3" />
									{formatCost(item.totalCost)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							{item.drawings.slice(0, 4).map((drawing, idx) => {
								const model = getModelById(drawing.modelId);
								const isHuman =
									drawing.isHumanDrawing || drawing.modelId === "human";
								if (!model && !isHuman) return null;
								return isHuman ? (
									<div
										key={drawing.id}
										className={cn(
											"size-6 rounded-full border-2 transition-all bg-muted flex items-center justify-center",
											idx === currentDrawingIndex
												? "border-primary scale-110"
												: "border-background",
										)}
										title={item.playerName || "Player"}
									>
										<User className="size-3 text-muted-foreground" />
									</div>
								) : (
									<div
										key={drawing.id}
										className={cn(
											"size-6 rounded-full border-2 transition-all",
											idx === currentDrawingIndex
												? "border-primary scale-110"
												: "border-background",
										)}
										style={{ backgroundColor: model?.color }}
										title={model?.name}
									/>
								);
							})}
							{item.drawings.length > 4 && (
								<span className="text-xs text-muted-foreground">
									+{item.drawings.length - 4}
								</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function GalleryListItem({ item }: { item: GalleryItem }) {
	const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
	const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const currentDrawing = item.drawings[currentDrawingIndex];
	const chunks = currentDrawing?.chunks || [];
	const hasReplay = chunks.length > 0;

	const allFrames = hasReplay
		? [...chunks, currentDrawing?.svg || ""]
		: [currentDrawing?.svg || ""];

	const currentSvg = allFrames[currentChunkIndex] || currentDrawing?.svg || "";

	useEffect(() => {
		if (!hasReplay) return;

		intervalRef.current = setInterval(() => {
			setCurrentChunkIndex((prev) => {
				if (prev >= allFrames.length - 1) {
					setTimeout(() => {
						setCurrentDrawingIndex((di) => (di + 1) % item.drawings.length);
						setCurrentChunkIndex(0);
					}, 800);
					return prev;
				}
				return prev + 1;
			});
		}, 50);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [hasReplay, allFrames.length, item.drawings.length, currentDrawingIndex]);

	useEffect(() => {
		setCurrentChunkIndex(0);
	}, [currentDrawingIndex]);

	const correctGuesses = item.guesses.filter((g) => g.isCorrect).length;
	const isImageDataUrl = currentSvg.startsWith("data:image");

	return (
		<Link href={`/gallery/${item.id}`}>
			<Card className="group cursor-pointer transition-all hover:shadow-md">
				<CardContent className="p-4">
					<div className="flex gap-4">
						<div className="size-20 bg-white rounded-lg overflow-hidden shrink-0 relative">
							{currentDrawing ? (
								isImageDataUrl ? (
									<img
										src={currentSvg}
										alt={item.prompt}
										className="w-full h-full object-contain"
									/>
								) : (
									<div
										className="w-full h-full"
										dangerouslySetInnerHTML={{ __html: currentSvg }}
									/>
								)
							) : (
								<div className="w-full h-full flex items-center justify-center text-muted-foreground">
									<Image className="size-8 opacity-50" />
								</div>
							)}
							{item.drawings.length > 1 && (
								<div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
									{item.drawings.map((_, idx) => (
										<div
											key={idx}
											className={cn(
												"size-1 rounded-full transition-all",
												idx === currentDrawingIndex
													? "bg-primary"
													: "bg-muted-foreground/30",
											)}
										/>
									))}
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="font-medium group-hover:text-primary transition-colors line-clamp-1">
										&ldquo;{item.prompt}&rdquo;
									</p>
									<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
										<span>{item.drawings.length} drawings</span>
										<span>•</span>
										<span>{item.guesses.length} guesses</span>
										{correctGuesses > 0 && (
											<>
												<span>•</span>
												<span className="text-green-600">
													{correctGuesses} correct
												</span>
											</>
										)}
									</div>
								</div>
								<div className="text-right text-xs text-muted-foreground shrink-0">
									{item.playerName && (
										<div className="flex items-center gap-1 justify-end">
											<User className="size-3" />
											{item.playerName}
										</div>
									)}
									<div>
										{formatDistanceToNow(new Date(item.createdAt), {
											addSuffix: true,
										})}
									</div>
									<div>{formatCost(item.totalCost)}</div>
								</div>
							</div>
							<div className="flex items-center gap-1 mt-2">
								{item.drawings.slice(0, 6).map((drawing, idx) => {
									const model = getModelById(drawing.modelId);
									const isHuman =
										drawing.isHumanDrawing || drawing.modelId === "human";
									if (!model && !isHuman) return null;
									return isHuman ? (
										<div
											key={drawing.id}
											className={cn(
												"size-5 rounded-full border transition-all bg-muted flex items-center justify-center",
												idx === currentDrawingIndex
													? "border-primary scale-110"
													: "border-background",
											)}
											title={item.playerName || "Player"}
										>
											<User className="size-2.5 text-muted-foreground" />
										</div>
									) : (
										<div
											key={drawing.id}
											className={cn(
												"size-5 rounded-full border transition-all",
												idx === currentDrawingIndex
													? "border-primary scale-110"
													: "border-background",
											)}
											style={{ backgroundColor: model?.color }}
											title={model?.name}
										/>
									);
								})}
								{item.drawings.length > 6 && (
									<span className="text-xs text-muted-foreground ml-1">
										+{item.drawings.length - 6}
									</span>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
