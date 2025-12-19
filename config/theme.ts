/**
 * Theme Configuration
 * Centralized theme colors and model tag styling
 */

// AI Model Tag Colors - used for filtering and display
export const MODEL_TAG_COLORS: Record<string, string> = {
  'Midjourney': '#5865F2',
  'DALL-E 3': '#10A37F',
  'Stable Diffusion': '#A855F7',
  'Flux': '#EC4899',
  'Leonardo.AI': '#F97316',
  'ComfyUI': '#22C55E',
  'Runway': '#3B82F6',
  'Sora': '#000000',
  'Pika': '#8B5CF6',
  'Kling': '#FF6B35',
  'Suno': '#FACC15',
  'Udio': '#06B6D4',
  'DeepSeek': '#2563EB',
  'Banana': '#FBBF24',
  '其他模型': '#6B7280',
};

// Category color type
export interface CategoryColor {
  bg: string;
  text: string;
  border: string;
}

// Category Colors - for generation type badges
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  '文生图': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  '文生视频': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  '文生音频': {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  '其他': {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
};

// Default category color for unknown categories
export const DEFAULT_CATEGORY_COLOR: CategoryColor = {
  bg: 'bg-gray-500/10',
  text: 'text-gray-400',
  border: 'border-gray-500/30',
};

/**
 * Get color for a model tag
 * @param modelTag - The model tag name
 * @returns Hex color string
 */
export function getModelTagColor(modelTag: string): string {
  return MODEL_TAG_COLORS[modelTag] || MODEL_TAG_COLORS['其他模型'];
}

/**
 * Get style classes for a category
 * @param category - The category name
 * @returns Object with bg, text, and border class names
 */
export function getCategoryColors(category: string): CategoryColor {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// Theme Colors - can be expanded for dark/light mode support
export const THEME = {
  // Primary colors
  primary: {
    DEFAULT: '#38BDF8', // tech-primary (sky blue)
    light: '#7DD3FC',
    dark: '#0EA5E9',
  },
  accent: {
    DEFAULT: '#F59E0B', // tech-accent (amber)
    light: '#FBBF24',
    dark: '#D97706',
  },
  // Dark theme background colors
  dark: {
    900: '#0A0A0F',
    800: '#12121A',
    700: '#1A1A24',
  },
};
