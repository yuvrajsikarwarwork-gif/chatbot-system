export type PromptBudgetSection = {
  key: string;
  text: string;
  priority?: number;
  reservedTokens?: number;
};

export type PromptBudgetResult = {
  sections: Array<{
    key: string;
    text: string;
    estimatedTokens: number;
    truncated: boolean;
  }>;
  usedTokens: number;
  availableTokens: number;
};

const DEFAULT_CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string, charsPerToken = DEFAULT_CHARS_PER_TOKEN) {
  const normalized = String(text || "");
  if (!normalized.trim()) {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / Math.max(1, charsPerToken)));
}

export function truncateToTokenBudget(
  text: string,
  tokenBudget: number,
  charsPerToken = DEFAULT_CHARS_PER_TOKEN
) {
  const normalized = String(text || "");
  if (!normalized.trim()) {
    return "";
  }

  const maxChars = Math.max(0, tokenBudget) * Math.max(1, charsPerToken);
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

export function fitSectionsToTokenBudget(
  sections: PromptBudgetSection[],
  totalTokenBudget: number,
  charsPerToken = DEFAULT_CHARS_PER_TOKEN
): PromptBudgetResult {
  const ordered = [...sections].sort(
    (left, right) => Number(right.priority || 0) - Number(left.priority || 0)
  );
  let usedTokens = 0;

  const fittedSections = ordered.map((section) => {
    const availableTokens = Math.max(0, totalTokenBudget - usedTokens);
    const requestedTokens =
      section.reservedTokens && section.reservedTokens > 0
        ? Math.min(section.reservedTokens, availableTokens)
        : availableTokens;
    const truncatedText = truncateToTokenBudget(section.text, requestedTokens, charsPerToken);
    const estimatedTokens = estimateTokenCount(truncatedText, charsPerToken);
    usedTokens += estimatedTokens;

    return {
      key: section.key,
      text: truncatedText,
      estimatedTokens,
      truncated: truncatedText !== String(section.text || ""),
    };
  });

  return {
    sections: fittedSections,
    usedTokens,
    availableTokens: Math.max(0, totalTokenBudget),
  };
}
