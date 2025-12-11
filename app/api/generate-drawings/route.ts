import { streamObject } from "ai";
import { z } from "zod";
import { AVAILABLE_MODELS, calculateCost, getModelById } from "@/lib/models";

const SVG_SCHEMA = z.object({
	svg: z
		.string()
		.describe(
			"A valid SVG string that draws the concept. Use simple shapes, paths, and colors. The SVG should be 400x400 pixels with viewBox='0 0 400 400'. Use a transparent background. Keep it minimal and recognizable like a doodle.",
		),
});

const SYSTEM_PROMPT = `You are a creative artist that draws simple, charming doodles as SVG graphics.

Rules:
- Create a simple, recognizable doodle of the given concept
- Use SVG with viewBox="0 0 400 400"
- Use simple shapes: circles, rectangles, paths, lines
- Use a limited color palette (2-4 colors)
- Keep lines thick (stroke-width 3-6) for visibility
- No text elements in the SVG
- Make it cute and playful, like a quick sketch
- The drawing should be immediately recognizable`;

export async function POST(request: Request) {
	try {
		const { prompt, models: selectedModelIds } = await request.json();

		if (!prompt || typeof prompt !== "string") {
			return Response.json({ error: "Prompt is required" }, { status: 400 });
		}

		// Use selected models or fallback to defaults
		const modelsToUse = selectedModelIds?.length
			? selectedModelIds.map((id: string) => getModelById(id)).filter(Boolean)
			: AVAILABLE_MODELS.slice(0, 4);

		if (modelsToUse.length === 0) {
			return Response.json(
				{ error: "No valid models selected" },
				{ status: 400 },
			);
		}

		// Create a streaming response
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
							prompt,
							totalModels,
							models: modelsToUse.map((m: (typeof AVAILABLE_MODELS)[0]) => ({
								id: m.id,
								name: m.name,
								color: m.color,
							})),
						})}\n\n`,
					),
				);

				// Generate drawings from all models in parallel with streaming
				const drawingPromises = modelsToUse.map(
					async (model: (typeof AVAILABLE_MODELS)[0]) => {
						const modelStartTime = Date.now();
						console.log(`[${model.id}] Starting generation...`);

						try {
							const result = streamObject({
								model: model.id,
								schema: SVG_SCHEMA,
								system: SYSTEM_PROMPT,
								prompt: `Draw a simple doodle of: ${prompt}`,
								temperature: 0.7,
							});

							let lastSvg = "";
							let chunkCount = 0;

							// Stream partial SVG updates
							for await (const partial of result.partialObjectStream) {
								chunkCount++;
								if (
									partial.svg &&
									partial.svg !== lastSvg &&
									partial.svg.length > lastSvg.length
								) {
									lastSvg = partial.svg;
									console.log(
										`[${model.id}] Chunk ${chunkCount}: ${partial.svg.length} chars`,
									);
									controller.enqueue(
										encoder.encode(
											`data: ${JSON.stringify({
												type: "partial",
												modelId: model.id,
												svg: partial.svg,
											})}\n\n`,
										),
									);
								}
							}
							console.log(
								`[${model.id}] Stream complete, ${chunkCount} chunks total`,
							);

							const generationTimeMs = Date.now() - modelStartTime;

							// Get final result and usage
							const finalObject = await result.object;
							const usage = await result.usage;
							const inputTokens = usage?.inputTokens ?? 0;
							const outputTokens = usage?.outputTokens ?? 0;
							const cost = calculateCost(model.id, inputTokens, outputTokens);

							completedCount++;

							const drawingResult = {
								type: "drawing",
								modelId: model.id,
								svg: finalObject.svg,
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
								encoder.encode(`data: ${JSON.stringify(drawingResult)}\n\n`),
							);

							return drawingResult;
						} catch (error) {
							const errorMsg =
								error instanceof Error ? error.message : String(error);
							console.error(`[${model.id}] ERROR:`, errorMsg);
							completedCount++;

							const errorResult = {
								type: "error",
								modelId: model.id,
								error: error instanceof Error ? error.message : "Unknown error",
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
				const results = await Promise.all(drawingPromises);
				const totalTimeMs = Date.now() - startTime;

				// Calculate totals
				const successfulDrawings = results.filter((r) => r.type === "drawing");
				const totalCost = successfulDrawings.reduce(
					(sum, d) => sum + (d.cost || 0),
					0,
				);
				const totalTokens = successfulDrawings.reduce(
					(sum, d) => sum + (d.usage?.totalTokens || 0),
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
							successCount: successfulDrawings.length,
							errorCount: results.length - successfulDrawings.length,
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
		console.error("Error in generate-drawings:", error);
		return Response.json(
			{ error: "Failed to generate drawings" },
			{ status: 500 },
		);
	}
}
