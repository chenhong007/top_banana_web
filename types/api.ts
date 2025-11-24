/**
 * API request and response type definitions
 */

export interface CreatePromptRequest {
  effect: string;
  description: string;
  tags: string[];
  prompt: string;
  source: string;
  imageUrl?: string;
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

