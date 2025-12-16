"use client";

import { Eraser, Minus, Pencil, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DrawingCanvasProps {
	onDrawingChange?: (dataUrl: string) => void;
	className?: string;
}

const ACCENT_COLORS = [
	"#EF4444",
	"#F97316",
	"#EAB308",
	"#22C55E",
	"#3B82F6",
	"#8B5CF6",
	"#EC4899",
	"#78716C",
];

function getThemeColors(isDark: boolean) {
	if (isDark) {
		return { background: "#252525", foreground: "#FBFBFB" };
	}
	return { background: "#FFFFFF", foreground: "#252525" };
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 512;

export function DrawingCanvas({
	onDrawingChange,
	className,
}: DrawingCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const cursorRef = useRef<HTMLDivElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [color, setColor] = useState("#000000");
	const [brushSize, setBrushSize] = useState(8);
	const [tool, setTool] = useState<"pen" | "eraser">("pen");
	const [history, setHistory] = useState<ImageData[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const lastPosRef = useRef<{ x: number; y: number } | null>(null);
	const [themeColors, setThemeColors] = useState({ background: "#FFFFFF", foreground: "#252525" });

	const colors = [themeColors.foreground, themeColors.background, ...ACCENT_COLORS];

	useEffect(() => {
		const isDark = document.documentElement.classList.contains("dark");
		const colors = getThemeColors(isDark);
		setThemeColors(colors);
		setColor(colors.foreground);

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = colors.background;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		setHistory([imageData]);
		setHistoryIndex(0);
	}, []);

	const saveState = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push(imageData);

		if (newHistory.length > 50) {
			newHistory.shift();
		}

		setHistory(newHistory);
		setHistoryIndex(newHistory.length - 1);

		if (onDrawingChange) {
			onDrawingChange(canvas.toDataURL("image/png"));
		}
	}, [history, historyIndex, onDrawingChange]);

	const undo = useCallback(() => {
		if (historyIndex <= 0) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const newIndex = historyIndex - 1;
		ctx.putImageData(history[newIndex], 0, 0);
		setHistoryIndex(newIndex);

		if (onDrawingChange) {
			onDrawingChange(canvas.toDataURL("image/png"));
		}
	}, [history, historyIndex, onDrawingChange]);

	const redo = useCallback(() => {
		if (historyIndex >= history.length - 1) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const newIndex = historyIndex + 1;
		ctx.putImageData(history[newIndex], 0, 0);
		setHistoryIndex(newIndex);

		if (onDrawingChange) {
			onDrawingChange(canvas.toDataURL("image/png"));
		}
	}, [history, historyIndex, onDrawingChange]);

	const clear = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = themeColors.background;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		saveState();
	}, [saveState, themeColors.background]);

	const getCoordinates = (
		e:
			| React.MouseEvent<HTMLCanvasElement>
			| React.TouchEvent<HTMLCanvasElement>,
	): { x: number; y: number } | null => {
		const canvas = canvasRef.current;
		if (!canvas) return null;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		if ("touches" in e) {
			const touch = e.touches[0];
			if (!touch) return null;
			return {
				x: (touch.clientX - rect.left) * scaleX,
				y: (touch.clientY - rect.top) * scaleY,
			};
		}

		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	};

	const startDrawing = (
		e:
			| React.MouseEvent<HTMLCanvasElement>
			| React.TouchEvent<HTMLCanvasElement>,
	) => {
		const coords = getCoordinates(e);
		if (!coords) return;

		setIsDrawing(true);
		lastPosRef.current = coords;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.beginPath();
		ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
		ctx.fillStyle = tool === "eraser" ? themeColors.background : color;
		ctx.fill();
	};

	const draw = (
		e:
			| React.MouseEvent<HTMLCanvasElement>
			| React.TouchEvent<HTMLCanvasElement>,
	) => {
		if (!isDrawing) return;

		const coords = getCoordinates(e);
		if (!coords || !lastPosRef.current) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.beginPath();
		ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
		ctx.lineTo(coords.x, coords.y);
		ctx.strokeStyle = tool === "eraser" ? themeColors.background : color;
		ctx.lineWidth = brushSize;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.stroke();

		lastPosRef.current = coords;
	};

	const stopDrawing = () => {
		if (isDrawing) {
			setIsDrawing(false);
			lastPosRef.current = null;
			saveState();
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (cursorRef.current) {
			const rect = canvasRef.current!.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			cursorRef.current.style.left = `${x}px`;
			cursorRef.current.style.top = `${y}px`;
		}
		draw(e);
	};

	const handleMouseLeave = () => {
		if (cursorRef.current) {
			cursorRef.current.style.display = "none";
		}
		stopDrawing();
	};

	const handleMouseEnter = () => {
		if (cursorRef.current) {
			cursorRef.current.style.display = "block";
		}
	};

	const adjustBrushSize = (delta: number) => {
		setBrushSize((prev) => Math.min(32, Math.max(2, prev + delta)));
	};

	return (
		<div className={cn("relative w-full h-full flex items-center justify-center", className)}>
			<div className="relative w-full h-full max-w-4xl flex items-center justify-center">
				<div className="relative rounded-xl overflow-hidden border border-border bg-background">
					<div
						ref={cursorRef}
						className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 border border-muted-foreground/50 z-10"
						style={{
							width: brushSize,
							height: brushSize,
							display: "none",
							backgroundColor: tool === "eraser" ? themeColors.background : "transparent",
						}}
					/>
					<canvas
						ref={canvasRef}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						className="touch-none cursor-none max-w-full max-h-[calc(100dvh-16rem)] w-auto h-auto object-contain block"
						onMouseDown={startDrawing}
						onMouseMove={handleMouseMove}
						onMouseUp={stopDrawing}
						onMouseLeave={handleMouseLeave}
						onMouseEnter={handleMouseEnter}
						onTouchStart={startDrawing}
						onTouchMove={draw}
						onTouchEnd={stopDrawing}
					/>

				<div className="absolute bottom-2 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-xl sm:rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-lg">
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="size-7 sm:size-8 rounded-full border-2 border-foreground hover:scale-110 transition-transform shrink-0"
								style={{ backgroundColor: color }}
							/>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-2 sm:p-3" side="top" sideOffset={8}>
							<div className="grid grid-cols-5 gap-1.5 sm:gap-2">
								{colors.map((c) => (
									<button
										type="button"
										key={c}
										onClick={() => {
											setColor(c);
											setTool("pen");
										}}
										className={cn(
											"size-7 sm:size-8 rounded-full border-2 transition-all hover:scale-110",
											color === c && tool === "pen"
												? "border-foreground ring-2 ring-ring ring-offset-1 sm:ring-offset-2"
												: "border-border",
										)}
										style={{ backgroundColor: c }}
									/>
								))}
							</div>
						</PopoverContent>
					</Popover>

					<div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

					<Button
						variant={tool === "pen" ? "default" : "ghost"}
						size="icon"
						className="size-7 sm:size-8 rounded-full shrink-0"
						onClick={() => setTool("pen")}
					>
						<Pencil className="size-3.5 sm:size-4" />
					</Button>
					<Button
						variant={tool === "eraser" ? "default" : "ghost"}
						size="icon"
						className="size-7 sm:size-8 rounded-full shrink-0"
						onClick={() => setTool("eraser")}
					>
						<Eraser className="size-3.5 sm:size-4" />
					</Button>

					<div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

					<div className="flex items-center gap-0.5 bg-muted rounded-full px-1 py-0.5 sm:py-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-5 sm:size-6 rounded-full"
							onClick={() => adjustBrushSize(-2)}
							disabled={brushSize <= 2}
						>
							<Minus className="size-2.5 sm:size-3" />
						</Button>
						<div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
							<div
								className="rounded-full bg-foreground transition-all"
								style={{
									width: Math.max(3, brushSize * 0.6),
									height: Math.max(3, brushSize * 0.6),
								}}
							/>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="size-5 sm:size-6 rounded-full"
							onClick={() => adjustBrushSize(2)}
							disabled={brushSize >= 32}
						>
							<Plus className="size-2.5 sm:size-3" />
						</Button>
					</div>

					<div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

					<Button
						variant="ghost"
						size="icon"
						className="size-7 sm:size-8 rounded-full shrink-0"
						onClick={undo}
						disabled={historyIndex <= 0}
					>
						<Undo2 className="size-3.5 sm:size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 sm:size-8 rounded-full shrink-0"
						onClick={redo}
						disabled={historyIndex >= history.length - 1}
					>
						<Redo2 className="size-3.5 sm:size-4" />
					</Button>

					<div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

					<Button
						variant="ghost"
						size="icon"
						className="size-7 sm:size-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
						onClick={clear}
					>
						<Trash2 className="size-3.5 sm:size-4" />
					</Button>
				</div>
				</div>
			</div>
		</div>
	);
}
