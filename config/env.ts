/**
 * Environment Variables Validation Layer
 * Uses Zod to validate and type-check all environment variables
 */

import { z } from 'zod';

// Helper for boolean string parsing
const booleanString = z.string().transform((val) => val === 'true');
const optionalBooleanString = z.string().optional().transform((val) => val === 'true');

// Helper for comma-separated string to array
const commaSeparatedArray = z.string().optional().transform((val) => 
  val ? val.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean) : []
);

// Server-side environment variables schema
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Authentication
  ADMIN_USERNAME: z.string().optional().default('admin'),
  ADMIN_PASSWORD: z.string().min(6).optional().default('admin123'),
  AUTH_SECRET: z.string().min(16).optional().default('your-secret-key-change-in-production'),

  // Deployment
  DEPLOY_MODE: z.enum(['frontend', 'full']).optional().default('full'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),

  // Cloudflare R2 Storage (optional)
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional().default('topai-images'),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().url().optional().or(z.literal('')).or(z.undefined()),

  // Image optimization
  DISABLE_IMAGE_OPTIMIZATION: optionalBooleanString,
});

// Client-side environment variables schema (NEXT_PUBLIC_ prefix)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_BASE_PATH: z.string().optional(),
  NEXT_PUBLIC_SHOW_ADMIN_ENTRY: z.string().optional().transform((val) => val !== 'false'),
  NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS: commaSeparatedArray,
  NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS: optionalBooleanString,
});

// Combined schema for full validation
const envSchema = serverEnvSchema.merge(clientEnvSchema);

// Type exports
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse server environment variables
 * Call this on the server side only
 */
function parseServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid server environment variables');
  }

  return parsed.data;
}

/**
 * Validate and parse client environment variables
 * Safe to use on both client and server
 */
function parseClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
    NEXT_PUBLIC_SHOW_ADMIN_ENTRY: process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY,
    NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS: process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS,
    NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS,
  });

  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid client environment variables');
  }

  return parsed.data;
}

// Lazy initialization for server env to avoid errors in client bundles
let _serverEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() should only be called on the server side');
  }
  if (!_serverEnv) {
    _serverEnv = parseServerEnv();
  }
  return _serverEnv;
}

// Client env can be parsed immediately
export const clientEnv = parseClientEnv();

/**
 * Check if R2 storage is configured
 */
export function isR2Configured(): boolean {
  const env = getServerEnv();
  return !!(
    env.CLOUDFLARE_R2_ACCOUNT_ID &&
    env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  );
}

/**
 * Get R2 public URL or API proxy URL
 */
export function getR2ImageUrl(key: string): string {
  const env = getServerEnv();
  if (env.CLOUDFLARE_R2_PUBLIC_URL) {
    return `${env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
  }
  return `/api/images/${encodeURIComponent(key)}`;
}
