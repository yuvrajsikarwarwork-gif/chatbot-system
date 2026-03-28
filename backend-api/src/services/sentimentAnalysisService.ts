export type SentimentResult = {
  label: "positive" | "neutral" | "negative";
  score: number;
  shouldEscalate: boolean;
};

const STRONG_NEGATIVE_PATTERNS = [
  "very bad",
  "not working",
  "worst",
  "angry",
  "frustrated",
  "cancel order",
  "refund",
  "complaint",
  "fake",
  "useless",
  "hate",
];

const NEGATIVE_KEYWORDS = new Set([
  "angry",
  "annoyed",
  "awful",
  "bad",
  "cancel",
  "complaint",
  "disappointed",
  "frustrated",
  "hate",
  "issue",
  "problem",
  "refund",
  "scam",
  "terrible",
  "useless",
  "worst",
]);

export async function analyzeMessageSentiment(input: string): Promise<SentimentResult> {
  const text = String(input || "").toLowerCase().trim();
  if (!text) {
    return { label: "neutral", score: 0, shouldEscalate: false };
  }

  let score = 0;
  for (const phrase of STRONG_NEGATIVE_PATTERNS) {
    if (text.includes(phrase)) {
      score += 2;
    }
  }

  for (const word of text.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (NEGATIVE_KEYWORDS.has(word)) {
      score += 1;
    }
  }

  if (text.includes("!!!")) {
    score += 1;
  }

  return {
    label: score >= 2 ? "negative" : "neutral",
    score,
    shouldEscalate: score >= 2,
  };
}
