import { cn } from "@/lib/utils";

export const diagonalGridPattern = cn(
	"relative",
	"before:absolute before:-left-[100vw] before:-z-1 before:h-full before:w-[200vw]",
	"before:bg-[repeating-linear-gradient(315deg,var(--pattern-foreground)_0,var(--pattern-foreground)_1px,transparent_0,transparent_50%)] before:bg-size-[10px_10px] before:[--pattern-foreground:var(--color-edge)]/56",
);

export const contentContainer =
	"mx-auto border-x border-edge w-full px-2 md:max-w-3xl";
