"use client";

import Lottie from "lottie-react";
import { useTheme } from "@/hooks/use-theme";
import animationData from "@/public/pIntel_animation_brand.json";

interface LogoAnimationProps {
	className?: string;
}

export function LogoAnimation({ className }: LogoAnimationProps) {
	const { mounted, isDark } = useTheme();

	const isLight = mounted && !isDark;

	return (
		<div className={className} style={{ aspectRatio: "16/9" }}>
			<Lottie
				animationData={animationData}
				loop={false}
				aria-label="pintel logo animation"
				style={{
					background: "transparent",
					width: "100%",
					height: "100%",
					filter: isLight ? "invert(1)" : "none",
				}}
			/>
		</div>
	);
}
