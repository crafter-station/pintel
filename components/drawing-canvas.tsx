"use client";

import { Eraser, Pencil, Redo2, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface DrawingCanvasProps {
	onDrawingChange?: (dataUrl: string) => void;
	width?: number;
	height?: number;
	className?: string;
}

const COLORS = [
	"#000000", // Black
	"#FFFFFF", // White
	"#EF4444", // Red
	"#F97316", // Orange
	"#EAB308", // Yellow
	"#22C55E", // Green
	"#3B82F6", // Blue
	"#8B5CF6", // Purple
	"#EC4899", // Pink
	"#78716C", // Brown
];

export function DrawingCanvas({
	onDrawingChange,
	width = 400,
	height = 400,
	className,
}: DrawingCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [color, setColor] = useState("#000000");
	const [brushSize, setBrushSize] = useState(8);
	const [tool, setTool] = useState<"pen" | "eraser">("pen");
	const [history, setHistory] = useState<ImageData[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const lastPosRef = useRef<{ x: number; y: number } | null>(null);

	// Initialize canvas with white background
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(0, 0, width, height);

		// Save initial state
		const imageData = ctx.getImageData(0, 0, width, height);
		setHistory([imageData]);
		setHistoryIndex(0);
	}, [width, height]);

	const saveState = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const imageData = ctx.getImageData(0, 0, width, height);

		// Remove any redo states
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push(imageData);

		// Limit history to 50 states
		if (newHistory.length > 50) {
			newHistory.shift();
		}

		setHistory(newHistory);
		setHistoryIndex(newHistory.length - 1);

		// Notify parent of change
		if (onDrawingChange) {
			onDrawingChange(canvas.toDataURL("image/png"));
		}
	}, [history, historyIndex, width, height, onDrawingChange]);

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

		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(0, 0, width, height);
		saveState();
	}, [width, height, saveState]);

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

		// Draw a dot for single clicks
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.beginPath();
		ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
		ctx.fillStyle = tool === "eraser" ? "#FFFFFF" : color;
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
		ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
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

	const _getDataUrl = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return "";
		return canvas.toDataURL("image/png");
	}, []);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{/* Canvas */}
			<div className="relative rounded-xl overflow-hidden border-2 border-border bg-white shadow-lg">
				<canvas
					ref={canvasRef}
					width={width}
					height={height}
					className="touch-none cursor-crosshair w-full h-auto"
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
			</div>

			{/* Tools */}
			<div className="flex items-center justify-between gap-4">
				{/* Colors */}
				<div className="flex gap-1">
					{COLORS.map((c) => (
						<button
							type="button"
							key={c}
							onClick={() => {
								setColor(c);
								setTool("pen");
							}}
							className={cn(
								"size-7 rounded-full border-2 transition-all hover:scale-110",
								color === c && tool === "pen"
									? "border-primary ring-2 ring-primary ring-offset-2"
									: "border-border",
							)}
							style={{ backgroundColor: c }}
						/>
					))}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1">
					<Button
						variant={tool === "pen" ? "default" : "outline"}
						size="icon"
						onClick={() => setTool("pen")}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant={tool === "eraser" ? "default" : "outline"}
						size="icon"
						onClick={() => setTool("eraser")}
					>
						<Eraser className="size-4" />
					</Button>
					<div className="w-px h-6 bg-border mx-1" />
					<Button
						variant="outline"
						size="icon"
						onClick={undo}
						disabled={historyIndex <= 0}
					>
						<Undo2 className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={redo}
						disabled={historyIndex >= history.length - 1}
					>
						<Redo2 className="size-4" />
					</Button>
					<div className="w-px h-6 bg-border mx-1" />
					<Button variant="outline" size="icon" onClick={clear}>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			{/* Brush Size */}
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-16">
					Brush: {brushSize}px
				</span>
				<Slider
					value={[brushSize]}
					onValueChange={([value]) => setBrushSize(value)}
					min={2}
					max={32}
					step={2}
					className="flex-1"
				/>
			</div>
		</div>
	);
}
