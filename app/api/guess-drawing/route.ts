import { streamText } from "ai";
import { calculateCost, getModelById, VISION_MODELS } from "@/lib/models";

const SYSTEM_PROMPT = `You are playing a drawing guessing game. A human has drawn something and you need to guess what it is.

Rules:
- Look at the drawing carefully
- Make your best guess in 1-3 words
- Be specific (e.g., "a cat" not "an animal")
- If unsure, still make your best guess
- Respond ONLY with your guess, nothing else
- No explanations, just the guess`;

export async function POST(request: Request) {
	try {
		const { imageDataUrl, models: selectedModelIds } = await request.json();

		if (!imageDataUrl || typeof imageDataUrl !== "string") {
			return Response.json(
				{ error: "Image data is required" },
				{ status: 400 },
			);
		}

		// Use selected models or fallback to defaults
		const modelsToUse = selectedModelIds?.length
			? selectedModelIds
					.map((id: string) => getModelById(id))
					.filter(Boolean)
					.filter((m: { id: string }) => VISION_MODELS.includes(m.id))
			: VISION_MODELS.slice(0, 4)
					.map((id) => getModelById(id))
					.filter(Boolean);

		if (modelsToUse.length === 0) {
			return Response.json(
				{ error: "No valid vision models selected" },
				{ status: 400 },
			);
		}

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				const startTime = Date.now();
				let completedCount = 0;
				const totalModels = modelsToUse.length;

				// Send initial message
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "start",
							totalModels,
							models: modelsToUse.map(
								(m: { id: string; name: string; color: string }) => ({
									id: m.id,
									name: m.name,
									color: m.color,
								}),
							),
						})}\n\n`,
					),
				);

				// Generate guesses from all models in parallel
				const guessPromises = modelsToUse.map(
					async (model: { id: string; name: string; color: string }) => {
						const modelStartTime = Date.now();
						console.log(`[${model.id}] Starting guess...`);

						try {
							let fullGuess = "";

							const result = streamText({
								model: model.id,
								system: SYSTEM_PROMPT,
								messages: [
									{
										role: "user",
										content: [
											{
												type: "image",
												image: imageDataUrl,
											},
											{
												type: "text",
												text: "What is this drawing? Give your best guess in 1-3 words.",
											},
										],
									},
								],
								temperature: 0.3,
							});

							// Stream the guess text
							for await (const chunk of result.textStream) {
								fullGuess += chunk;
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({
											type: "partial",
											modelId: model.id,
											guess: fullGuess.trim(),
										})}\n\n`,
									),
								);
							}

							const generationTimeMs = Date.now() - modelStartTime;
							const usage = await result.usage;
							const inputTokens = usage?.inputTokens ?? 0;
							const outputTokens = usage?.outputTokens ?? 0;
							const cost = calculateCost(model.id, inputTokens, outputTokens);

							completedCount++;
							console.log(
								`[${model.id}] Guess: "${fullGuess.trim()}" (${generationTimeMs}ms)`,
							);

							const guessResult = {
								type: "guess",
								modelId: model.id,
								guess: fullGuess.trim(),
								generationTimeMs,
								usage: {
									promptTokens: inputTokens,
									completionTokens: outputTokens,
									totalTokens: inputTokens + outputTokens,
								},
								cost,
								completedCount,
								totalModels,
							};

							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify(guessResult)}\n\n`),
							);

							return guessResult;
						} catch (error) {
							const errorMsg =
								error instanceof Error ? error.message : String(error);
							console.error(`[${model.id}] ERROR:`, errorMsg);
							completedCount++;

							const errorResult = {
								type: "error",
								modelId: model.id,
								error: errorMsg,
								generationTimeMs: Date.now() - modelStartTime,
								completedCount,
								totalModels,
							};

							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`),
							);

							return errorResult;
						}
					},
				);

				// Wait for all to complete
				const results = await Promise.all(guessPromises);
				const totalTimeMs = Date.now() - startTime;

				// Calculate totals
				const successfulGuesses = results.filter((r) => r.type === "guess");
				const totalCost = successfulGuesses.reduce(
					(sum, g) => sum + (g.cost || 0),
					0,
				);
				const totalTokens = successfulGuesses.reduce(
					(sum, g) => sum + (g.usage?.totalTokens || 0),
					0,
				);

				// Send completion message
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "complete",
							totalTimeMs,
							totalCost,
							totalTokens,
							successCount: successfulGuesses.length,
							errorCount: results.length - successfulGuesses.length,
						})}\n\n`,
					),
				);

				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error in guess-drawing:", error);
		return Response.json(
			{ error: "Failed to generate guesses" },
			{ status: 500 },
		);
	}
}
