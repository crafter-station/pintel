/**
 * Guess Validation Algorithm
 *
 * Combines multiple metrics to score how well a guess matches a prompt:
 * - Word Coverage (35%): % of prompt words found in guess
 * - Semantic Similarity (30%): Embedding cosine similarity for synonyms
 * - Unigram Jaccard (20%): Word set intersection/union
 * - Bigram Jaccard (5%): Phrase-level matching
 * - Length Penalty (10%): sqrt(guess_len/prompt_len) to penalize short guesses
 *
 * Correctness thresholds:
 * - Single-word prompts: score >= 0.9
 * - Multi-word prompts: coverage >= 0.7 AND score >= 0.75
 */

import { embed } from "ai";

// Stop words to ignore in word matching
const STOP_WORDS = new Set([
	"a",
	"an",
	"the",
	"in",
	"on",
	"at",
	"to",
	"for",
	"of",
	"with",
	"by",
	"is",
	"it",
	"and",
	"or",
]);

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Normalize text for comparison
function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ");
}

// Extract meaningful words (remove stop words)
function extractWords(text: string): string[] {
	return normalizeText(text)
		.split(" ")
		.filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

// Generate n-grams from text
function generateNgrams(words: string[], n: number): Set<string> {
	const ngrams = new Set<string>();
	for (let i = 0; i <= words.length - n; i++) {
		ngrams.add(words.slice(i, i + n).join(" "));
	}
	return ngrams;
}

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
	if (setA.size === 0 && setB.size === 0) return 1;
	if (setA.size === 0 || setB.size === 0) return 0;

	const intersection = new Set([...setA].filter((x) => setB.has(x)));
	const union = new Set([...setA, ...setB]);

	return intersection.size / union.size;
}

// Calculate word coverage: what % of prompt words appear in guess
function wordCoverage(guessWords: string[], promptWords: string[]): number {
	if (promptWords.length === 0) return 1;

	const guessSet = new Set(guessWords);
	const matchedWords = promptWords.filter((word) => guessSet.has(word));

	return matchedWords.length / promptWords.length;
}

// Combined similarity score using multiple metrics
function calculateCombinedScore(
	guessWords: string[],
	promptWords: string[],
	semanticSimilarity: number,
): { score: number; breakdown: Record<string, number> } {
	// Word coverage (how much of the prompt is captured)
	const coverage = wordCoverage(guessWords, promptWords);

	// Jaccard similarity of unigrams
	const unigramJaccard = jaccardSimilarity(
		new Set(guessWords),
		new Set(promptWords),
	);

	// Bigram similarity (for phrase matching)
	const guessBigrams = generateNgrams(guessWords, 2);
	const promptBigrams = generateNgrams(promptWords, 2);
	const bigramJaccard = jaccardSimilarity(guessBigrams, promptBigrams);

	// Length penalty: penalize if guess is much shorter than prompt
	const lengthRatio = Math.min(guessWords.length / promptWords.length, 1);
	const lengthPenalty = lengthRatio ** 0.5; // Square root for gentler penalty

	// Weighted combination
	// - Coverage matters most (did they get the key concepts?)
	// - Semantic helps with synonyms
	// - Jaccard helps with exact word matching
	// - Length penalty ensures partial answers don't score too high
	const weightedScore =
		coverage * 0.35 +
		semanticSimilarity * 0.3 +
		unigramJaccard * 0.2 +
		bigramJaccard * 0.05 +
		lengthPenalty * 0.1;

	return {
		score: weightedScore,
		breakdown: {
			coverage,
			semantic: semanticSimilarity,
			unigram: unigramJaccard,
			bigram: bigramJaccard,
			lengthPenalty,
		},
	};
}

export async function POST(request: Request) {
	let guess = "";
	let prompt = "";

	try {
		const body = await request.json();
		guess = body.guess || "";
		prompt = body.prompt || "";

		if (!guess || !prompt) {
			return Response.json(
				{ error: "Both guess and prompt are required" },
				{ status: 400 },
			);
		}

		const normalizedGuess = normalizeText(guess);
		const normalizedPrompt = normalizeText(prompt);

		// Quick exact match check (after normalization)
		if (normalizedGuess === normalizedPrompt) {
			return Response.json({
				isCorrect: true,
				similarity: 1.0,
				method: "exact",
			});
		}

		// Extract meaningful words
		const guessWords = extractWords(guess);
		const promptWords = extractWords(prompt);

		// Check if guess captures ALL key words (perfect word match)
		const coverage = wordCoverage(guessWords, promptWords);
		if (coverage >= 0.99 && guessWords.length >= promptWords.length * 0.8) {
			return Response.json({
				isCorrect: true,
				similarity: 0.98,
				method: "word_match",
			});
		}

		// Use embeddings for semantic comparison
		let semanticSimilarity = 0;
		try {
			const [guessEmbedding, promptEmbedding] = await Promise.all([
				embed({
					model: "openai/text-embedding-3-small",
					value: normalizedGuess,
				}),
				embed({
					model: "openai/text-embedding-3-small",
					value: normalizedPrompt,
				}),
			]);

			semanticSimilarity = cosineSimilarity(
				guessEmbedding.embedding,
				promptEmbedding.embedding,
			);
		} catch (e) {
			console.error("Embedding failed:", e);
			// Continue without semantic score
		}

		// Calculate combined score
		const { score, breakdown } = calculateCombinedScore(
			guessWords,
			promptWords,
			semanticSimilarity,
		);

		// More nuanced thresholds:
		// - Need high coverage AND good overall score for correct
		// - Single-word prompts: higher threshold (0.9)
		// - Multi-word prompts: need good coverage (0.7+) AND score (0.75+)
		const isSingleWordPrompt = promptWords.length === 1;
		const isCorrect = isSingleWordPrompt
			? score >= 0.9
			: coverage >= 0.7 && score >= 0.75;

		return Response.json({
			isCorrect,
			similarity: Math.round(score * 100) / 100,
			method: "combined",
			debug: {
				guessWords,
				promptWords,
				breakdown: Object.fromEntries(
					Object.entries(breakdown).map(([k, v]) => [
						k,
						Math.round(v * 100) / 100,
					]),
				),
			},
		});
	} catch (error) {
		console.error("Error checking guess:", error);

		// Fallback to simple word overlap
		const guessWords = extractWords(guess);
		const promptWords = extractWords(prompt);
		const coverage = wordCoverage(guessWords, promptWords);

		return Response.json({
			isCorrect: coverage >= 0.9,
			similarity: Math.round(coverage * 100) / 100,
			method: "fallback",
			error: "Combined scoring failed, used word coverage",
		});
	}
}
