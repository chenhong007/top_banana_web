/**
 * Text Similarity Utilities
 * Provides algorithms for comparing text similarity between prompts
 */

/**
 * Normalize text for comparison
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple whitespace to single space
 * - Remove punctuation (optional, for more lenient matching)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Calculate Levenshtein distance between two strings
 * This is the minimum number of single-character edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio based on Levenshtein distance
 * Returns a value between 0 and 1, where 1 means identical strings
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);

  if (normalized1 === normalized2) {
    return 1;
  }

  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  return 1 - distance / maxLength;
}

/**
 * Split text into tokens (words)
 */
function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter(token => token.length > 0)
  );
}

/**
 * Calculate Jaccard similarity between two strings
 * Based on the intersection over union of word tokens
 * Returns a value between 0 and 1, where 1 means identical token sets
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  if (tokens1.size === 0 && tokens2.size === 0) {
    return 1; // Both empty = identical
  }

  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0;
  }

  // Calculate intersection
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  
  // Calculate union
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Combined similarity score using both Levenshtein and Jaccard
 * Weighted average: 60% Levenshtein (character-level) + 40% Jaccard (word-level)
 * This provides a balanced approach that catches both:
 * - Near-identical texts with minor typos (Levenshtein)
 * - Texts with same words in different order (Jaccard)
 */
export function combinedSimilarity(str1: string, str2: string): number {
  const levSim = levenshteinSimilarity(str1, str2);
  const jacSim = jaccardSimilarity(str1, str2);
  
  return 0.6 * levSim + 0.4 * jacSim;
}

/**
 * Check if two prompt texts are similar above a given threshold
 * @param prompt1 First prompt text
 * @param prompt2 Second prompt text  
 * @param threshold Similarity threshold (default 0.9 = 90%)
 * @returns Object with isSimilar boolean and similarity score
 */
export function checkPromptSimilarity(
  prompt1: string,
  prompt2: string,
  threshold: number = 0.9
): { isSimilar: boolean; similarity: number } {
  const similarity = combinedSimilarity(prompt1, prompt2);
  return {
    isSimilar: similarity >= threshold,
    similarity,
  };
}

/**
 * Find the most similar prompt from a list
 * @param targetPrompt The prompt to compare against
 * @param existingPrompts Array of existing prompts with id and prompt text
 * @param threshold Minimum similarity threshold to consider as a match
 * @returns The most similar prompt if above threshold, null otherwise
 */
export function findMostSimilarPrompt(
  targetPrompt: string,
  existingPrompts: Array<{ id: string; prompt: string }>,
  threshold: number = 0.9
): { id: string; prompt: string; similarity: number } | null {
  let mostSimilar: { id: string; prompt: string; similarity: number } | null = null;

  for (const existing of existingPrompts) {
    const { similarity } = checkPromptSimilarity(targetPrompt, existing.prompt, threshold);
    
    if (similarity >= threshold) {
      if (!mostSimilar || similarity > mostSimilar.similarity) {
        mostSimilar = {
          id: existing.id,
          prompt: existing.prompt,
          similarity,
        };
      }
    }
  }

  return mostSimilar;
}

