/**
 * Style Utilities
 * Centralized style class definitions to avoid repetition
 */

// Base input styles - added transition and subtle ring
export const INPUT_BASE = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ease-in-out shadow-sm hover:border-gray-300';

// Input variants
export const INPUT_STYLES = {
  base: INPUT_BASE,
  disabled: `${INPUT_BASE} disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed`,
  textarea: `${INPUT_BASE} min-h-[100px] resize-y`,
  mono: `${INPUT_BASE} font-mono text-sm bg-gray-50/50`,
} as const;

// Button base styles - added shadow and transform
const BUTTON_BASE = 'px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-sm';

// Button variants - refined colors and added gradients/shadows
export const BUTTON_STYLES = {
  primary: `${BUTTON_BASE} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 hover:shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed disabled:shadow-none`,
  secondary: `${BUTTON_BASE} bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md disabled:bg-gray-50 disabled:text-gray-400`,
  success: `${BUTTON_BASE} bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 hover:shadow-lg`,
  danger: `${BUTTON_BASE} bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:shadow-red-100`,
  ghost: `${BUTTON_BASE} bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent shadow-none`,
  dark: `${BUTTON_BASE} bg-gray-900 text-white hover:bg-gray-800 hover:shadow-gray-200 hover:shadow-lg`,
} as const;

// Card styles - increased roundness and shadow
export const CARD_STYLES = {
  base: 'bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100',
  withPadding: 'bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8',
  hover: 'bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300',
} as const;

// Table cell styles - more spacing and better font
export const TABLE_STYLES = {
  header: 'px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100',
  cell: 'px-6 py-4 align-middle border-b border-gray-50 last:border-0',
  cellText: 'text-sm text-gray-600 font-medium',
  row: 'hover:bg-gray-50/80 transition-colors duration-150 group',
} as const;

// Badge/Tag styles - pill shape and rings
export const BADGE_STYLES = {
  primary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10',
  success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10',
  warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10',
  danger: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
  neutral: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
} as const;

// Icon button styles
export const ICON_BUTTON_STYLES = {
  base: 'p-2 rounded-lg transition-colors',
  primary: 'p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200',
  danger: 'p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200',
  ghost: 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200',
} as const;

// Alert/Message styles
export const ALERT_STYLES = {
  error: 'bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 flex items-start gap-3 shadow-sm',
  success: 'bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 flex items-start gap-3 shadow-sm',
  warning: 'bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm',
  info: 'bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-4 flex items-start gap-3 shadow-sm',
} as const;

// Label styles
export const LABEL_STYLES = {
  base: 'block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5',
  required: 'block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5 after:content-["*"] after:ml-0.5 after:text-red-500',
} as const;

// Container styles
export const CONTAINER_STYLES = {
  page: 'min-h-screen bg-gray-50/50 font-sans selection:bg-blue-100',
  main: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8',
  header: 'bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-20 transition-all duration-300',
  headerContent: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4',
} as const;

// Utility function to combine class names
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

