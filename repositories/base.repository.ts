/**
 * Base Repository
 * Provides common CRUD operations and utilities for all repositories
 */

import prisma from '@/lib/db';
import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<TModel, TCreateData, TUpdateData, TDto> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Convert database model to DTO
   * Must be implemented by child classes
   */
  protected abstract toDTO(model: TModel): TDto;

  /**
   * Execute operation within a transaction
   * @param operation - The operation to execute
   * @param options - Transaction options (timeout in ms, default 60000ms = 60s)
   */
  protected async withTransaction<T>(
    operation: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options?: { timeout?: number; maxWait?: number }
  ): Promise<T> {
    return this.prisma.$transaction(operation, {
      timeout: options?.timeout ?? 60000,  // 默认 60 秒超时
      maxWait: options?.maxWait ?? 10000,  // 默认最大等待 10 秒
    });
  }

  /**
   * Handle database errors uniformly
   */
  protected handleError(error: unknown, context: string): never {
    console.error(`[${context}] Database error:`, error);
    
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    
    throw new Error('Database operation failed: Unknown error');
  }
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Calculate pagination values
 */
export function calculatePagination(options: PaginationOptions, total: number): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize || 12));
  const totalPages = Math.ceil(total / pageSize);
  const skip = (page - 1) * pageSize;

  return { skip, take: pageSize, page, pageSize, totalPages };
}

