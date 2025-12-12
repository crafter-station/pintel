import { embed } from "ai";

const EMBEDDING_MODEL = "openai/text-embedding-3-small" as const;

export async function getEmbedding(text: string): Promise<number[]> {
	const { embedding } = await embed({
		model: EMBEDDING_MODEL,
		value: text.toLowerCase().trim(),
	});
	return embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
	const results = await Promise.all(texts.map((text) => getEmbedding(text)));
	return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
	if (magnitude === 0) return 0;

	return dotProduct / magnitude;
}

export async function calculateSemanticScore(
	guess: string,
	answer: string,
): Promise<number> {
	const [guessEmbedding, answerEmbedding] = await getEmbeddings([
		guess,
		answer,
	]);
	const similarity = cosineSimilarity(guessEmbedding, answerEmbedding);
	return Math.max(0, Math.min(1, similarity));
}

export function calculateTimeBonus(
	timeMs: number,
	maxTimeMs: number = 60000,
): number {
	const timeSeconds = timeMs / 1000;
	if (timeSeconds < 10) return 20;
	if (timeSeconds < 30) return 10;
	if (timeSeconds < maxTimeMs / 1000) return 5;
	return 0;
}

export function calculateFinalScore(
	semanticScore: number,
	timeMs: number,
	isHumanGuesser: boolean = false,
): {
	baseScore: number;
	timeBonus: number;
	multiplier: number;
	finalScore: number;
} {
	const baseScore = Math.round(semanticScore * 100);
	const timeBonus = calculateTimeBonus(timeMs);
	const multiplier = isHumanGuesser ? 1.5 : 1.0;
	const finalScore = Math.round((baseScore + timeBonus) * multiplier);

	return { baseScore, timeBonus, multiplier, finalScore };
}
