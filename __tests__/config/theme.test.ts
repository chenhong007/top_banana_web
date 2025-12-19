/**
 * Theme Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  MODEL_TAG_COLORS,
  CATEGORY_COLORS,
  getModelTagColor,
  getCategoryColors,
  DEFAULT_CATEGORY_COLOR,
} from '@/config/theme';

describe('Theme Configuration', () => {
  describe('MODEL_TAG_COLORS', () => {
    it('should have color for Midjourney', () => {
      expect(MODEL_TAG_COLORS['Midjourney']).toBe('#5865F2');
    });

    it('should have color for DALL-E 3', () => {
      expect(MODEL_TAG_COLORS['DALL-E 3']).toBe('#10A37F');
    });

    it('should have fallback color for unknown models', () => {
      expect(MODEL_TAG_COLORS['其他模型']).toBe('#6B7280');
    });
  });

  describe('getModelTagColor', () => {
    it('should return correct color for known model', () => {
      expect(getModelTagColor('Midjourney')).toBe('#5865F2');
    });

    it('should return fallback color for unknown model', () => {
      expect(getModelTagColor('Unknown Model')).toBe('#6B7280');
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('should have colors for 文生图', () => {
      const colors = CATEGORY_COLORS['文生图'];
      expect(colors).toBeDefined();
      expect(colors.bg).toContain('blue');
      expect(colors.text).toContain('blue');
    });

    it('should have colors for 文生视频', () => {
      const colors = CATEGORY_COLORS['文生视频'];
      expect(colors).toBeDefined();
      expect(colors.bg).toContain('purple');
    });
  });

  describe('getCategoryColors', () => {
    it('should return correct colors for known category', () => {
      const colors = getCategoryColors('文生图');
      expect(colors.bg).toContain('blue');
    });

    it('should return default colors for unknown category', () => {
      const colors = getCategoryColors('Unknown Category');
      expect(colors).toEqual(DEFAULT_CATEGORY_COLOR);
    });
  });
});

