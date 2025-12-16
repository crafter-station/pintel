"use client";

import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	getModelStyle,
	MODEL_STYLE_INFO,
	type ModelConfig,
} from "@/lib/models";
import { cn } from "@/lib/utils";

const MAX_MODELS = 4;

interface ModelRosterProps {
	models: ModelConfig[];
	selectedIds: string[];
	onToggle: (modelId: string) => void;
	disabled?: boolean;
	currentDrawerId?: string;
	thinkingIds?: string[];
}

export function ModelRoster({
	models,
	selectedIds,
	onToggle,
	disabled = false,
	currentDrawerId,
	thinkingIds = [],
}: ModelRosterProps) {
	const handleToggle = (modelId: string) => {
		const isCurrentlySelected = selectedIds.includes(modelId);
		if (!isCurrentlySelected && selectedIds.length >= MAX_MODELS) {
			return;
		}
		onToggle(modelId);
	};

	const atLimit = selectedIds.length >= MAX_MODELS;

	return (
		<Card className="w-full lg:w-56 shrink-0 overflow-hidden">
			<CardContent className="p-2.5 space-y-1.5">
				<div className="flex items-center justify-between">
					<h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
						Opponents
					</h3>
					<span className={cn(
						"text-[10px] font-mono",
						atLimit ? "text-primary" : "text-muted-foreground"
					)}>
						{selectedIds.length}/{MAX_MODELS}
					</span>
				</div>

				<div className="space-y-0.5">
					{models.map((model) => {
						const isSelected = selectedIds.includes(model.id);
						const isDrawing = model.id === currentDrawerId;
						const isThinking = thinkingIds.includes(model.id);
						const style = getModelStyle(model);
						const styleInfo = MODEL_STYLE_INFO[style];
						const cannotSelect = !isSelected && atLimit;

						return (
							<div
								key={model.id}
								className={cn(
									"flex items-center gap-2 rounded-md transition-all duration-200",
									isSelected
										? "p-1.5 bg-muted/60 shadow-sm"
										: "p-1 opacity-50 hover:opacity-70",
									isDrawing && "ring-1 ring-primary ring-offset-1 ring-offset-background",
									isThinking && "animate-pulse",
									cannotSelect && "opacity-30 cursor-not-allowed",
								)}
							>
								<div
									className={cn(
										"rounded-full shrink-0 transition-all",
										isSelected ? "size-2.5" : "size-2",
									)}
									style={{ backgroundColor: model.color }}
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1">
										<span className={cn(
											"font-medium truncate transition-all",
											isSelected ? "text-xs" : "text-[11px]"
										)}>
											{model.name}
										</span>
										{isDrawing && (
											<span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">
												✏️
											</span>
										)}
										{isThinking && !isDrawing && (
											<span className="text-[9px]">🤔</span>
										)}
									</div>
									{isSelected && (
										<div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
											<span>{styleInfo.icon} {styleInfo.label}</span>
											<span className="flex items-center">
												<Zap className="size-2" />
												{model.tier === "budget" ? "$" : model.tier === "mid" ? "$$" : "$$$"}
											</span>
										</div>
									)}
								</div>
								<Switch
									checked={isSelected}
									onCheckedChange={() => handleToggle(model.id)}
									disabled={disabled || cannotSelect}
									className="scale-[0.6] data-[state=unchecked]:opacity-40"
								/>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
