/**
 * Prompt Service
 * Handles all prompt-related API calls
 */

import { PromptItem, CreatePromptRequest, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

class PromptService {
  private baseUrl = API_ENDPOINTS.PROMPTS;

  /**
   * Fetch all prompts
   */
  async getAll(): Promise<PromptItem[]> {
    const response = await fetch(this.baseUrl);
    const result: ApiResponse<PromptItem[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch prompts');
    }
    
    return result.data || [];
  }

  /**
   * Get a single prompt by ID
   */
  async getById(id: string): Promise<PromptItem> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    const result: ApiResponse<PromptItem> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch prompt');
    }
    
    if (!result.data) {
      throw new Error('Prompt not found');
    }
    
    return result.data;
  }

  /**
   * Create a new prompt
   */
  async create(data: CreatePromptRequest): Promise<PromptItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<PromptItem> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create prompt');
    }
    
    if (!result.data) {
      throw new Error('No data returned');
    }
    
    return result.data;
  }

  /**
   * Update an existing prompt
   */
  async update(id: string, data: Partial<CreatePromptRequest>): Promise<PromptItem> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<PromptItem> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update prompt');
    }
    
    if (!result.data) {
      throw new Error('No data returned');
    }
    
    return result.data;
  }

  /**
   * Delete a prompt
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<{ id: string }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete prompt');
    }
  }

  /**
   * Interact with a prompt (like or heart)
   */
  async interact(id: string, type: 'like' | 'heart'): Promise<PromptItem> {
    const response = await fetch(`${this.baseUrl}/${id}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });

    const result: ApiResponse<PromptItem> = await response.json();

    if (!result.success) {
      throw new Error(result.error || `Failed to ${type} prompt`);
    }

    if (!result.data) {
      throw new Error('No data returned');
    }

    return result.data;
  }
}

// Export singleton instance
export const promptService = new PromptService();

