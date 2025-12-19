/**
 * API Utils Tests
 */

import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
  createPromptSchema,
} from '@/lib/api-utils';

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should create a success response with data', async () => {
      const data = { id: '1', name: 'Test' };
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(response.status).toBe(200);
    });

    it('should accept custom status code', async () => {
      const response = successResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response', async () => {
      const response = errorResponse('Something went wrong');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Something went wrong');
      expect(response.status).toBe(500);
    });

    it('should accept custom status code', async () => {
      const response = errorResponse('Not authorized', 401);
      expect(response.status).toBe(401);
    });
  });

  describe('notFoundResponse', () => {
    it('should create a 404 response', async () => {
      const response = notFoundResponse('User not found');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('User not found');
      expect(response.status).toBe(404);
    });
  });

  describe('badRequestResponse', () => {
    it('should create a 400 response', async () => {
      const response = badRequestResponse('Invalid input');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid input');
      expect(response.status).toBe(400);
    });
  });
});

describe('Zod Schemas', () => {
  describe('createPromptSchema', () => {
    it('should validate a valid prompt', () => {
      const validPrompt = {
        effect: 'Test Effect',
        prompt: 'Test prompt content',
        description: 'Test description',
        tags: ['tag1', 'tag2'],
        source: 'https://example.com',
      };

      const result = createPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidPrompt = {
        description: 'Only description',
      };

      const result = createPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should use default values', () => {
      const minimalPrompt = {
        effect: 'Test',
        prompt: 'Content',
      };

      const result = createPromptSchema.safeParse(minimalPrompt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('');
        expect(result.data.tags).toEqual([]);
        expect(result.data.source).toBe('unknown');
      }
    });
  });
});

