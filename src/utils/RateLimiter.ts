import { logger } from "../config";

/**
 * A utility class to handle rate limiting for API calls.
 * Helps prevent hitting external API rate limits by adding delays between operations.
 */
export class RateLimiter {
  private delayMs: number;
  private lastCallTime: number = 0;

  /**
   * Creates a new RateLimiter instance.
   * @param delayMs - Delay in milliseconds between operations
   */
  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  /**
   * Waits for the configured delay if needed to respect rate limits.
   * Ensures minimum time has passed since the last operation.
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastCall;
      logger.debug(`Rate limiter: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }

  /**
   * Executes an array of async operations with rate limiting between each.
   * Useful for batch operations where you want to process items sequentially with delays.
   *
   * @param items - Array of items to process
   * @param operation - Async function to execute for each item
   * @param onProgress - Optional callback for progress updates
   * @returns Object with successful results and errors
   */
  async executeBatch<T, R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    onProgress?: (current: number, total: number) => void,
  ): Promise<{
    results: R[];
    errors: Array<{ item: T; error: string }>;
  }> {
    const results: R[] = [];
    const errors: Array<{ item: T; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await operation(items[i], i);
        results.push(result);

        // Report progress if callback provided
        if (onProgress) {
          onProgress(i + 1, items.length);
        }

        // Wait before next operation (except after the last one)
        if (i < items.length - 1) {
          await this.wait();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ item: items[i], error: errorMessage });

        // Check if error is rate limit related
        if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("403") ||
          errorMessage.includes("429")
        ) {
          logger.error(
            `Rate limit detected at item ${i + 1}/${items.length}. Stopping batch operation.`,
          );
          break; // Stop processing if we hit rate limit
        }
      }
    }

    return { results, errors };
  }

  /**
   * Resets the internal timer.
   * Useful if you want to start fresh without waiting for the initial delay.
   */
  reset(): void {
    this.lastCallTime = 0;
  }
}
