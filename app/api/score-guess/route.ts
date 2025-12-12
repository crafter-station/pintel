import { calculateFinalScore, calculateSemanticScore } from "@/lib/scoring";

export async function POST(request: Request) {
	try {
		const { guess, answer, timeMs, isHumanGuesser } = await request.json();

		if (!guess || typeof guess !== "string") {
			return Response.json({ error: "Guess is required" }, { status: 400 });
		}

		if (!answer || typeof answer !== "string") {
			return Response.json({ error: "Answer is required" }, { status: 400 });
		}

		const semanticScore = await calculateSemanticScore(guess, answer);
		const scoreBreakdown = calculateFinalScore(
			semanticScore,
			timeMs || 60000,
			isHumanGuesser || false,
		);

		return Response.json({
			guess,
			answer,
			semanticScore,
			...scoreBreakdown,
		});
	} catch (error) {
		console.error("Error in score-guess:", error);
		return Response.json(
			{ error: "Failed to calculate score" },
			{ status: 500 },
		);
	}
}
