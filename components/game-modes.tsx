"use client";

import { motion } from "motion/react";
import { GameModeCard, type GameMode } from "@/components/game-mode-card";

const heroMode: GameMode = {
	id: "human-judge",
	title: "Human Judge",
	tagline: "AI models draw. You pick the best one.",
	href: "/play/human-judge",
	available: true,
	isHero: true,
};

const satelliteModes: GameMode[] = [
	{
		id: "human-play",
		title: "Human Play",
		tagline: "Take turns drawing and guessing with AI.",
		href: "/play/human-play",
		available: true,
	},
	{
		id: "model-guess",
		title: "Model Guess",
		tagline: "You draw. AI models guess what it is.",
		href: "/play/model-guess",
		available: true,
	},
	{
		id: "ai-duel",
		title: "AI Duel",
		tagline: "AI models draw and guess each other.",
		href: "/play/ai-duel",
		available: true,
	},
];

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			type: "spring" as const,
			stiffness: 300,
			damping: 24,
		},
	},
};

export function GameModes() {
	return (
		<motion.div
			className="space-y-3"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			<motion.div variants={itemVariants}>
				<GameModeCard mode={heroMode} />
			</motion.div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{satelliteModes.map((mode) => (
					<motion.div key={mode.id} variants={itemVariants}>
						<GameModeCard mode={mode} />
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}
