"use client";

import type { Variants } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { motion, useAnimation } from "motion/react";
import { cn } from "@/lib/utils";

export interface PenToolIconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

interface PenToolIconProps extends HTMLAttributes<HTMLDivElement> {
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
			duration: 0.5,
			opacity: { duration: 0.1 },
			delay: 0.1 * custom,
		},
	}),
};

const circleVariants: Variants = {
	normal: {
		scale: 1,
		opacity: 1,
	},
	animate: {
		scale: [0, 1.2, 1],
		opacity: [0, 1],
		transition: {
			duration: 0.4,
			delay: 0.3,
		},
	},
};

const PenToolIcon = forwardRef<PenToolIconHandle, PenToolIconProps>(
	({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
						d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"
						custom={0}
					/>
					<motion.path
						variants={pathVariants}
						initial="normal"
						animate={controls}
						d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"
						custom={1}
					/>
					<motion.path
						variants={pathVariants}
						initial="normal"
						animate={controls}
						d="m2.3 2.3 7.286 7.286"
						custom={2}
					/>
					<motion.circle
						variants={circleVariants}
						initial="normal"
						animate={controls}
						cx="11"
						cy="11"
						r="2"
					/>
				</svg>
			</div>
		);
	},
);

PenToolIcon.displayName = "PenToolIcon";

export { PenToolIcon };
