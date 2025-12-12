"use client";

import { useCallback, useRef } from "react";

export function useSound(soundPath: string, volume = 0.3) {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const playSound = useCallback(() => {
		try {
			if (!audioRef.current) {
				audioRef.current = new Audio(soundPath);
				audioRef.current.volume = volume;
				audioRef.current.preload = "auto";
			}

			audioRef.current.currentTime = 0;
			audioRef.current.play().catch(() => {
				
			});
		} catch (error) {
		
		}
	}, [soundPath, volume]);

	return playSound;
}
