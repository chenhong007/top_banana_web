/**
 * Prompt Service
 * Handles all prompt-related API calls
 */

import { PromptItem, CreatePromptRequest, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

// Pagination response type
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class PromptService {
  private baseUrl = API_ENDPOINTS.PROMPTS;

  /**
   * Fetch all prompts (with optional pagination)
   */
  async getAll(page?: number, pageSize?: number, filters?: { search?: string; category?: string; tag?: string; modelTag?: string }): Promise<PromptItem[] | PaginatedResponse<PromptItem>> {
    const url = new URL(this.baseUrl, window.location.origin);
    if (page) url.searchParams.set('page', page.toString());
    if (pageSize) url.searchParams.set('pageSize', pageSize.toString());
    
    if (filters) {
      if (filters.search) url.searchParams.set('search', filters.search);
      if (filters.category) url.searchParams.set('category', filters.category);
      if (filters.tag) url.searchParams.set('tag', filters.tag);
      if (filters.modelTag) url.searchParams.set('modelTag', filters.modelTag);
    }

    const response = await fetch(url.toString());
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch prompts');
    }
    
    // Check if it's a paginated response
    if (result.pagination) {
      return result as PaginatedResponse<PromptItem>;
    }

    return result.data || [];
  }

  /**
   * Fetch prompts with pagination specifically
   */
  async getPaginated(
    page: number = 1, 
    pageSize: number = 20,
    filters?: { search?: string; category?: string; tag?: string; modelTag?: string }
  ): Promise<PaginatedResponse<PromptItem>> {
    const result = await this.getAll(page, pageSize, filters);
    if (Array.isArray(result)) {
      // Should not happen if API is correct, but handle gracefully
      return {
        success: true,
        data: result,
        pagination: {
          page: 1,
          pageSize: result.length,
          total: result.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
    return result as PaginatedResponse<PromptItem>;
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
