/**
 * Prompt-related type definitions
 */

export interface PromptItem {
  id: string;
  effect: string; // Effect description
  description: string; // Detailed description
  tags: string[]; // Evaluation targets (tags)
  prompt: string; // The prompt content
  source: string; // Prompt source
  imageUrl?: string; // Optional image URL
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

