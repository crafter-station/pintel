"use client";

import { Check, SearchX, Shuffle, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	getUniqueProviders,
	shuffleModels,
	type ModelConfig,
} from "@/lib/models";
import { cn } from "@/lib/utils";

const MAX_MODELS = 4;

type FilterType = "all" | "budget" | "mid" | "premium" | "flagship";

interface ModelSelectorProps {
	models: ModelConfig[];
	selectedIds: string[];
	onSelectionChange: (ids: string[]) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	disabled?: boolean;
}

function ModelGrid({
	models,
	selectedIds,
	onToggle,
}: {
	models: ModelConfig[];
	selectedIds: string[];
	onToggle: (id: string) => void;
}) {
	const [providerFilter, setProviderFilter] = useState<string>("all");
	const [tierFilter, setTierFilter] = useState<FilterType>("all");
	const providers = useMemo(() => getUniqueProviders(), []);

	const filteredModels = useMemo(() => {
		return models.filter((m) => {
			const matchesProvider =
				providerFilter === "all" || m.provider === providerFilter;
			const matchesTier = tierFilter === "all" || m.tier === tierFilter;
			return matchesProvider && matchesTier;
		});
	}, [models, providerFilter, tierFilter]);

	const atLimit = selectedIds.length >= MAX_MODELS;

	return (
		<div className="flex flex-col h-full">
			<div className="flex flex-wrap items-center gap-2 p-3 border-b shrink-0">
				<ToggleGroup
					type="single"
					value={providerFilter}
					onValueChange={(v) => v && setProviderFilter(v)}
					size="sm"
					className="flex-wrap"
				>
					<ToggleGroupItem value="all" className="text-xs h-7 px-2">All</ToggleGroupItem>
					{providers.slice(0, 6).map((provider) => (
						<ToggleGroupItem key={provider} value={provider} className="text-xs h-7 px-2">
							{provider}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<div className="h-4 w-px bg-border hidden sm:block" />
				<ToggleGroup
					type="single"
					value={tierFilter}
					onValueChange={(v) => v && setTierFilter(v as FilterType)}
					size="sm"
				>
					<ToggleGroupItem value="all" className="text-xs h-7 px-2">All</ToggleGroupItem>
					<ToggleGroupItem value="budget" className="text-xs h-7 px-2">$</ToggleGroupItem>
					<ToggleGroupItem value="mid" className="text-xs h-7 px-2">$$</ToggleGroupItem>
					<ToggleGroupItem value="premium" className="text-xs h-7 px-2">$$$</ToggleGroupItem>
					<ToggleGroupItem value="flagship" className="text-xs h-7 px-2">$$$$</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<div className="flex-1 overflow-y-auto p-3 pb-16 min-h-[280px]">
				{filteredModels.length === 0 ? (
					<Empty className="h-full border-0 p-4">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<SearchX />
							</EmptyMedia>
							<EmptyTitle className="text-sm">No models found</EmptyTitle>
							<EmptyDescription className="text-xs">
								Try adjusting your filters
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{filteredModels.map((model) => {
							const isSelected = selectedIds.includes(model.id);
							const isDisabled = !isSelected && atLimit;
							const tierLabel = model.tier === "budget" ? "$" : model.tier === "mid" ? "$$" : model.tier === "premium" ? "$$$" : "$$$$";

							return (
								<button
									key={model.id}
									type="button"
									onClick={() => !isDisabled && onToggle(model.id)}
									disabled={isDisabled}
									className={cn(
										"group flex items-center gap-2 px-2 py-2 rounded-lg border-2 transition-all",
										isSelected
											? "border-primary bg-primary/10"
											: isDisabled
												? "opacity-30 cursor-not-allowed border-transparent bg-muted/30"
												: "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20",
									)}
								>
									<div
										className="w-1 h-6 rounded-full shrink-0"
										style={{ backgroundColor: model.color }}
									/>
									<div className="flex-1 min-w-0 text-left">
										<span className="text-xs font-medium truncate block">
											{model.name}
										</span>
										<span className="text-[10px] text-muted-foreground">
											{tierLabel}
										</span>
									</div>
									<div
										className={cn(
											"size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
											isSelected
												? "border-primary bg-primary text-primary-foreground"
												: "border-muted-foreground/30 group-hover:border-muted-foreground/50",
										)}
									>
										{isSelected && <Check className="size-2.5" strokeWidth={3} />}
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

export function ModelSelector({
	models,
	selectedIds,
	onSelectionChange,
	open,
	onOpenChange,
	disabled = false,
}: ModelSelectorProps) {
	const isMobile = useIsMobile();

	const toggleModel = useCallback(
		(modelId: string) => {
			if (selectedIds.includes(modelId)) {
				onSelectionChange(selectedIds.filter((id) => id !== modelId));
			} else if (selectedIds.length < MAX_MODELS) {
				onSelectionChange([...selectedIds, modelId]);
			}
		},
		[selectedIds, onSelectionChange],
	);

	const shuffleSelection = useCallback(() => {
		const shuffled = shuffleModels(models, MAX_MODELS);
		onSelectionChange(shuffled.map((m) => m.id));
	}, [models, onSelectionChange]);

	const content = (
		<>
			<ModelGrid
				models={models}
				selectedIds={selectedIds}
				onToggle={toggleModel}
			/>
			<div className="p-3 border-t flex items-center gap-2 shrink-0 bg-background sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
				<Button
					variant="outline"
					size="sm"
					onClick={shuffleSelection}
					className="flex-1"
				>
					<Shuffle className="size-3" />
					Random
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onSelectionChange([])}
					disabled={selectedIds.length === 0}
					className="flex-1"
				>
					Clear
				</Button>
				<Badge variant="secondary" className="ml-auto">
					{selectedIds.length}/{MAX_MODELS}
				</Badge>
			</div>
		</>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent className="h-[70vh]">
					<DrawerHeader className="pb-2">
						<DrawerTitle>Select Opponents</DrawerTitle>
					</DrawerHeader>
					<div className="flex-1 overflow-hidden flex flex-col min-h-0">
						{content}
					</div>
					<DrawerFooter className="pt-2">
						<DrawerClose asChild>
							<Button>Done</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl h-[70vh] max-h-[700px] flex flex-col p-0 gap-0">
				<DialogHeader className="p-4 pb-0">
					<DialogTitle>Select Opponents</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-hidden flex flex-col min-h-0">
					{content}
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface ModelSelectorTriggerProps {
	models: ModelConfig[];
	selectedIds: string[];
	onClick: () => void;
	disabled?: boolean;
	thinkingIds?: string[];
	currentDrawerId?: string;
}

export function ModelSelectorTrigger({
	models,
	selectedIds,
	onClick,
	disabled = false,
	thinkingIds = [],
	currentDrawerId,
}: ModelSelectorTriggerProps) {
	const selectedModels = models.filter((m) => selectedIds.includes(m.id));

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"group flex items-center gap-1.5 sm:gap-2.5 px-2 sm:pl-3 sm:pr-2 py-1.5 rounded-lg border bg-card transition-all",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "hover:bg-accent hover:border-primary/50 hover:shadow-md cursor-pointer",
			)}
		>
			<div className="flex -space-x-1.5">
				{selectedModels.slice(0, 4).map((model) => {
					const isThinking = thinkingIds.includes(model.id);
					const isDrawing = model.id === currentDrawerId;
					return (
						<div
							key={model.id}
							className={cn(
								"size-4 sm:size-5 rounded-full border-2 border-card transition-all",
								isThinking && "animate-pulse",
								isDrawing && "ring-2 ring-primary",
							)}
							style={{ backgroundColor: model.color }}
							title={model.name}
						/>
					);
				})}
			</div>
			<div className="hidden sm:flex flex-col items-start">
				<span className="text-xs font-semibold leading-tight">
					{selectedIds.length} models
				</span>
				<span className="text-[10px] text-muted-foreground leading-tight">
					{disabled ? "In game" : "Click to edit"}
				</span>
			</div>
			<span className="sm:hidden text-[10px] font-medium">{selectedIds.length}</span>
			{!disabled && (
				<svg className="size-3.5 sm:size-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			)}
		</button>
	);
}
