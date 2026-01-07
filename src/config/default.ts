/**
 * Configuration management with environment variable loading and validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import type { ZoteroConfig } from '../types/config.js';

// Load environment variables
dotenv.config();

// Define configuration schema with Zod
const ConfigSchema = z
  .object({
    apiKey: z.string().min(1, 'ZOTERO_API_KEY is required'),
    userId: z.string().optional(),
    groupId: z.string().optional(),
    baseUrl: z.string().url().default('https://api.zotero.org'),
    timeout: z.coerce.number().min(1000).default(30000),
    maxRetries: z.coerce.number().min(0).max(10).default(3),
    cacheEnabled: z
      .string()
      .optional()
      .default('true')
      .transform((val) => val === 'true'),
    cacheTTL: z.coerce.number().min(0).default(300),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .refine((data) => data.userId || data.groupId, {
    message: 'Either ZOTERO_USER_ID or ZOTERO_GROUP_ID must be provided',
  });

// Parse and validate configuration
function loadConfig(): ZoteroConfig {
  const rawConfig = {
    apiKey: process.env.ZOTERO_API_KEY,
    userId: process.env.ZOTERO_USER_ID,
    groupId: process.env.ZOTERO_GROUP_ID,
    baseUrl: process.env.ZOTERO_BASE_URL,
    timeout: process.env.ZOTERO_TIMEOUT,
    maxRetries: process.env.ZOTERO_MAX_RETRIES,
    cacheEnabled: process.env.CACHE_ENABLED,
    cacheTTL: process.env.CACHE_TTL_SECONDS,
    logLevel: process.env.LOG_LEVEL,
  };

  try {
    const validated = ConfigSchema.parse(rawConfig);
    return {
      ...validated,
      cacheEnabled: validated.cacheEnabled as boolean,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Configuration validation failed:\n  ${messages.join('\n  ')}`);
    }
    throw error;
  }
}

export const config = loadConfig();
