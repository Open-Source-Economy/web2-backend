import { logger } from "../config";
import { RateLimiter } from "./RateLimiter";

export interface BatchOptions {
  offset?: number;
  batchSize: number;
  maxBatchSize?: number; // Optional cap on batch size
  rateLimiter?: RateLimiter; // Optional rate limiter for delays between items
}

export interface BatchResult<T, R> {
  results: R[];
  errors: Array<{ item: T; error: string }>;
  batchInfo: {
    offset: number;
    batchSize: number;
    totalItems: number;
    hasMore: boolean;
    nextOffset?: number;
    processedCount: number;
  };
}

/**
 * A utility class to handle batch processing of large arrays.
 * Useful for processing subsets of data with pagination support.
 */
export class Batcher {
  /**
   * Processes a batch of items from a larger array.
   *
   * @param allItems - Complete array of items to process
   * @param operation - Async function to execute for each item in the batch
   * @param options - Batch configuration (offset, batchSize, maxBatchSize)
   * @param context - Optional context string for logging
   * @returns Batch results with success/error info and pagination metadata
   */
  static async processBatch<T, R>(
    allItems: T[],
    operation: (item: T, index: number) => Promise<R>,
    options: BatchOptions,
    context?: string,
  ): Promise<BatchResult<T, R>> {
    const offset = options.offset || 0;
    const requestedBatchSize = options.batchSize;
    const maxBatchSize = options.maxBatchSize;

    // Apply batch size cap if specified
    const effectiveBatchSize = maxBatchSize
      ? Math.min(requestedBatchSize, maxBatchSize)
      : requestedBatchSize;

    if (maxBatchSize && requestedBatchSize > maxBatchSize) {
      logger.warn(
        `Requested batch size ${requestedBatchSize} exceeds maximum ${maxBatchSize}. Using ${maxBatchSize}.`,
      );
    }

    // Calculate batch boundaries
    const totalItems = allItems.length;
    const endIndex = Math.min(offset + effectiveBatchSize, totalItems);
    const batchItems = allItems.slice(offset, endIndex);
    const hasMore = endIndex < totalItems;

    const contextStr = context ? ` ${context}` : "";
    logger.info(
      `Processing batch${contextStr}: items ${offset + 1}-${endIndex} of ${totalItems} total (batch size: ${effectiveBatchSize})`,
    );

    if (hasMore) {
      logger.info(
        `Remaining items: ${totalItems - endIndex}. Process next batch with offset=${endIndex}.`,
      );
    }

    // Process each item in the batch
    const results: R[] = [];
    const errors: Array<{ item: T; error: string }> = [];

    const rateLimiter = options.rateLimiter;

    for (let i = 0; i < batchItems.length; i++) {
      try {
        const result = await operation(batchItems[i], offset + i);
        results.push(result);

        // Wait before next item if rate limiter is configured (except after last item)
        if (rateLimiter && i < batchItems.length - 1) {
          await rateLimiter.wait();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ item: batchItems[i], error: errorMessage });
        logger.error(
          `Error processing item ${offset + i + 1}${contextStr}:`,
          error,
        );

        // Check if error is rate limit related
        if (
          rateLimiter &&
          (errorMessage.includes("rate limit") ||
            errorMessage.includes("403") ||
            errorMessage.includes("429"))
        ) {
          logger.error(
            `Rate limit detected at item ${offset + i + 1}${contextStr}. Stopping batch operation.`,
          );
          break; // Stop processing if we hit rate limit
        }
      }
    }

    logger.info(
      `Completed batch${contextStr}: ${results.length} processed successfully, ${errors.length} errors`,
    );

    return {
      results,
      errors,
      batchInfo: {
        offset,
        batchSize: effectiveBatchSize,
        totalItems,
        hasMore,
        nextOffset: hasMore ? endIndex : undefined,
        processedCount: batchItems.length,
      },
    };
  }
}
