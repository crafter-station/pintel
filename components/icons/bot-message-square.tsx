"use client";

import type { Variants } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { motion, useAnimation } from "motion/react";
import { cn } from "@/lib/utils";

export interface BotMessageSquareIconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface BotMessageSquareIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number;
}

const pathVariants: Variants = {
	normal: {
		opacity: 1,
		pathLength: 1,
		transition: {
			duration: 0.3,
			opacity: { duration: 0.1 },
		},
	},
	animate: (custom: number) => ({
		opacity: [0, 1],
		pathLength: [0, 1],
		transition: {
			duration: 0.4,
			opacity: { duration: 0.1 },
			delay: 0.08 * custom,
		},
	}),
};

const eyeVariants: Variants = {
	normal: {
		scaleY: 1,
	},
	animate: {
		scaleY: [1, 0.1, 1],
		transition: {
			duration: 0.3,
			delay: 0.4,
			repeat: 1,
			repeatDelay: 0.2,
		},
	},
};

const BotMessageSquareIcon = forwardRef<
	BotMessageSquareIconHandle,
	BotMessageSquareIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
	const controls = useAnimation();
	const isControlledRef = useRef(false);

	useImperativeHandle(ref, () => {
		isControlledRef.current = true;
		return {
			startAnimation: () => controls.start("animate"),
			stopAnimation: () => controls.start("normal"),
		};
	});

	const handleMouseEnter = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!isControlledRef.current) {
				controls.start("animate");
			} else {
				onMouseEnter?.(e);
			}
		},
		[controls, onMouseEnter],
	);

	const handleMouseLeave = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!isControlledRef.current) {
				controls.start("normal");
			} else {
				onMouseLeave?.(e);
			}
		},
		[controls, onMouseLeave],
	);

	return (
		<div
			className={cn(className)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			{...props}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<motion.path
					variants={pathVariants}
					initial="normal"
					animate={controls}
					d="M12 6V2H8"
					custom={0}
				/>
				<motion.path
					variants={pathVariants}
					initial="normal"
					animate={controls}
					d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"
					custom={1}
				/>
				<motion.path
					variants={pathVariants}
					initial="normal"
					animate={controls}
					d="M2 12h2"
					custom={2}
				/>
				<motion.path
					variants={eyeVariants}
					initial="normal"
					animate={controls}
					d="M9 11v2"
					style={{ transformOrigin: "center" }}
				/>
				<motion.path
					variants={eyeVariants}
					initial="normal"
					animate={controls}
					d="M15 11v2"
					style={{ transformOrigin: "center" }}
				/>
				<motion.path
					variants={pathVariants}
					initial="normal"
					animate={controls}
					d="M20 12h2"
					custom={3}
				/>
			</svg>
		</div>
	);
});

BotMessageSquareIcon.displayName = "BotMessageSquareIcon";

export { BotMessageSquareIcon };
