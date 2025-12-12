"use client";

import Lottie from "lottie-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import animationData from "@/public/pIntel_animation_brand.json";

interface LogoAnimationProps {
	className?: string;
}

export function LogoAnimation({ className }: LogoAnimationProps) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isLight = mounted && resolvedTheme === "light";

	// Reserve space with aspect ratio to prevent layout shift
	// The animation is 1920x1080 (16:9 aspect ratio)
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
