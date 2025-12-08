"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingReplayProps {
  chunks: string[];
  finalSvg: string;
  className?: string;
  autoPlay?: boolean;
  compact?: boolean;
}

export function DrawingReplay({ 
  chunks, 
  finalSvg, 
  className,
  autoPlay = false,
  compact = false,
}: DrawingReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(2); // Default 2x for faster playback
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const allFrames = chunks.length > 0 ? [...chunks, finalSvg] : [finalSvg];
  const totalFrames = allFrames.length;
  const hasReplay = chunks.length > 0;

  const currentSvg = allFrames[Math.min(currentIndex, totalFrames - 1)] || finalSvg;

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay && hasReplay && !hasAutoPlayed) {
      const timer = setTimeout(() => {
        setIsPlaying(true);
        setHasAutoPlayed(true);
      }, 300); // Small delay for smoother UX
      return () => clearTimeout(timer);
    }
  }, [autoPlay, hasReplay, hasAutoPlayed]);

  const play = useCallback(() => {
    if (currentIndex >= totalFrames - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, totalFrames]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const toggleSpeed = useCallback(() => {
    setSpeed((prev) => (prev >= 4 ? 1 : prev * 2));
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const baseInterval = 80; // Faster base interval
      const interval = baseInterval / speed;
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, totalFrames]);

  const handleSliderChange = useCallback((value: number[]) => {
    setCurrentIndex(value[0]);
    setIsPlaying(false);
  }, []);

  const progress = totalFrames > 1 ? (currentIndex / (totalFrames - 1)) * 100 : 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "bg-white relative overflow-hidden rounded-lg",
        compact ? "aspect-[4/3]" : "aspect-square"
      )}>
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: currentSvg }}
        />
        {hasReplay && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
            {currentIndex + 1}/{totalFrames}
          </div>
        )}
      </div>

      {hasReplay && (
        <div className={cn("space-y-2", compact && "space-y-1")}>
          <Slider
            value={[currentIndex]}
            max={totalFrames - 1}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className={cn("h-7 w-7 p-0", compact && "h-6 w-6")}
            >
              <RotateCcw className={cn("size-3.5", compact && "size-3")} />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={isPlaying ? pause : play}
              className={cn("h-7 px-2 gap-1", compact && "h-6 text-xs")}
            >
              {isPlaying ? (
                <Pause className={cn("size-3.5", compact && "size-3")} />
              ) : (
                <Play className={cn("size-3.5", compact && "size-3")} />
              )}
              {!compact && (isPlaying ? "Pause" : currentIndex >= totalFrames - 1 ? "Replay" : "Play")}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSpeed}
              className={cn("h-7 px-2 gap-1 font-mono", compact && "h-6 text-xs")}
            >
              <FastForward className={cn("size-3.5", compact && "size-3")} />
              {speed}x
            </Button>
          </div>

          <div className="h-0.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
