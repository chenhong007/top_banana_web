/**
 * Configuration Module
 * Re-exports all configuration utilities
 */

export {
  getServerEnv,
  clientEnv,
  isR2Configured,
  getR2ImageUrl,
  type ServerEnv,
  type ClientEnv,
  type Env,
} from './env';

export {
  MODEL_TAG_COLORS,
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  THEME,
  getModelTagColor,
  getCategoryColors,
} from './theme';

