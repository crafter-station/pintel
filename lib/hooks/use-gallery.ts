import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserIdentity } from "./use-user-identity";

export type GameMode = "human_judge" | "model_guess" | "ai_duel";

export interface GalleryItem {
  id: string;
  mode: GameMode;
  prompt: string;
  totalCost: number;
  totalTokens: number;
  totalTimeMs: number | null;
  createdAt: string;
  drawings: Array<{
    id: string;
    modelId: string;
    svg: string;
    generationTimeMs: number | null;
    cost: number | null;
    isWinner: boolean;
    chunks?: string[] | null;
  }>;
  guesses: Array<{
    id: string;
    modelId: string;
    guess: string;
    isCorrect: boolean;
    generationTimeMs: number | null;
  }>;
}

export interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SaveSessionData {
  mode: GameMode;
  prompt: string;
  totalCost: number;
  totalTokens: number;
  totalTimeMs?: number;
  drawings: Array<{
    modelId: string;
    svg: string;
    generationTimeMs?: number;
    cost?: number;
    tokens?: number;
    isWinner?: boolean;
    chunks?: string[];
  }>;
  guesses?: Array<{
    modelId: string;
    guess: string;
    isCorrect: boolean;
    generationTimeMs?: number;
    cost?: number;
    tokens?: number;
  }>;
}

export function useGallery(mode?: GameMode, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["gallery", mode, page, pageSize],
    queryFn: async (): Promise<GalleryResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (mode) {
        params.append("mode", mode);
      }
      const res = await fetch(`/api/gallery?${params}`);
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
  });
}

export function useSaveSession() {
  const queryClient = useQueryClient();
  const { anonId } = useUserIdentity();

  return useMutation({
    mutationFn: async (data: SaveSessionData) => {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: ["gallery", id],
    queryFn: async (): Promise<GalleryItem> => {
      const res = await fetch(`/api/gallery/${id}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!id,
  });
}
