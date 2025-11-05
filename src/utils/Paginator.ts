import { logger } from "../config";
import { RateLimiter } from "./RateLimiter";

export interface PaginationOptions {
  perPage?: number;
  rateLimiter?: RateLimiter; // Optional rate limiter for delays between pages
  maxPages?: number; // Optional safety limit
}

export interface PaginationResult<T> {
  allItems: T[];
  totalPages: number;
  totalItems: number;
}

/**
 * A utility class to handle paginated API requests with rate limiting.
 * Automatically fetches all pages and aggregates results.
 */
export class Paginator {
  /**
   * Fetches all pages from a paginated API endpoint.
   *
   * @param fetchPage - Function that fetches a single page. Should return empty array when no more pages.
   * @param options - Pagination configuration options
   * @param context - Optional context string for logging (e.g., "organization repositories")
   * @returns All items from all pages
   */
  static async fetchAllPages<T>(
    fetchPage: (page: number, perPage: number) => Promise<T[]>,
    options: PaginationOptions = {},
    context?: string,
  ): Promise<PaginationResult<T>> {
    const perPage = options.perPage || 100;
    const maxPages = options.maxPages;
    const allItems: T[] = [];
    let page = 1;
    let hasMorePages = true;

    const rateLimiter = options.rateLimiter;

    const contextStr = context ? ` for ${context}` : "";
    logger.info(
      `Starting paginated fetch${contextStr} (perPage: ${perPage}, rateLimiting: ${rateLimiter ? "enabled" : "none"})`,
    );

    while (hasMorePages) {
      try {
        // Check max pages limit if specified
        if (maxPages && page > maxPages) {
          logger.warn(
            `Reached maximum page limit (${maxPages}). Stopping pagination${contextStr}.`,
          );
          break;
        }

        const items = await fetchPage(page, perPage);

        if (!items || items.length === 0) {
          // No more items to fetch
          hasMorePages = false;
          break;
        }

        logger.debug(
          `Fetched page ${page}: ${items.length} items${contextStr}`,
        );

        allItems.push(...items);

        // Check if this is the last page (fewer items than requested)
        if (items.length < perPage) {
          hasMorePages = false;
        } else {
          page++;
          // Wait before fetching next page if rate limiter is configured
          if (rateLimiter) {
            await rateLimiter.wait();
          }
        }
      } catch (error) {
        logger.error(`Error fetching page ${page}${contextStr}:`, error);
        throw error;
      }
    }

    logger.info(
      `Successfully fetched ${allItems.length} total items${contextStr} across ${page} pages`,
    );

    return {
      allItems,
      totalPages: page,
      totalItems: allItems.length,
    };
  }
}
