import { Pool } from "pg";
import { NewsletterSubscription } from "@open-source-economy/api-types";
import { pool } from "../dbPool";

export function getNewsletterSubscriptionRepository(): NewsletterSubscriptionRepository {
  return new NewsletterSubscriptionRepositoryImpl(pool);
}

export interface NewsletterSubscriptionRepository {
  /**
   * Creates a new newsletter subscription record.
   *
   * @param subscription - The subscription instance to create.
   * @returns The created NewsletterSubscription instance.
   */
  create(subscription: NewsletterSubscription): Promise<NewsletterSubscription>;

  /**
   * Retrieves a newsletter subscription by its email.
   *
   * @param email - The email associated with the subscription.
   * @returns The found NewsletterSubscription instance or null if none exists.
   */
  getByEmail(email: string): Promise<NewsletterSubscription | null>;

  /**
   * Retrieves all newsletter subscriptions.
   *
   * @returns An array of NewsletterSubscription instances.
   */
  getAll(): Promise<NewsletterSubscription[]>;

  /**
   * Deletes a newsletter subscription by email.
   *
   * @param email - The email associated with the subscription to delete.
   */
  delete(email: string): Promise<void>;
}

class NewsletterSubscriptionRepositoryImpl
  implements NewsletterSubscriptionRepository
{
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneSubscription(rows: any[]): NewsletterSubscription {
    const subscription = this.getOptionalSubscription(rows);
    if (subscription === null) {
      throw new Error("NewsletterSubscription not found");
    }
    return subscription;
  }

  private getOptionalSubscription(rows: any[]): NewsletterSubscription | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple newsletter subscriptions found");
    } else {
      const subscription = NewsletterSubscription.fromBackend(rows[0]);
      if (subscription instanceof Error) {
        throw subscription;
      }
      return subscription;
    }
  }

  private getSubscriptionList(rows: any[]): NewsletterSubscription[] {
    return rows.map((r) => {
      const subscription = NewsletterSubscription.fromBackend(r);
      if (subscription instanceof Error) {
        throw subscription;
      }
      return subscription;
    });
  }

  async create(
    subscription: NewsletterSubscription,
  ): Promise<NewsletterSubscription> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
          INSERT INTO newsletter_subscription (email)
          VALUES ($1)
          RETURNING email, created_at, updated_at
        `,
        [subscription.email],
      );

      return this.getOneSubscription(result.rows);
    } finally {
      client.release();
    }
  }

  async getByEmail(email: string): Promise<NewsletterSubscription | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM newsletter_subscription
        WHERE email = $1
      `,
      [email],
    );

    return this.getOptionalSubscription(result.rows);
  }

  async getAll(): Promise<NewsletterSubscription[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM newsletter_subscription
    `);

    return this.getSubscriptionList(result.rows);
  }

  async delete(email: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
          DELETE FROM newsletter_subscription
          WHERE email = $1
        `,
        [email],
      );
    } finally {
      client.release();
    }
  }
}
