import { setupTestDB } from "../__helpers__/jest.setup";
import { NewsletterSubscription } from "../../api/model/NewsletterSubscription";
import { v4 as uuidv } from "uuid";
import { newsletterSubscriptionRepo } from "../../db";

describe("NewsletterSubscriptionRepository", () => {
  // Reset or prepare your test DB environment.
  setupTestDB();

  describe("create", () => {
    it("should create a new newsletter subscription", async () => {
      const email = `test_${uuidv()}@example.com`;
      const subscription = new NewsletterSubscription(email);

      const created = await newsletterSubscriptionRepo.create(subscription);

      // Since the model only has an email property, compare on that
      expect(created.email).toEqual(subscription.email);
    });
  });

  describe("getByEmail", () => {
    it("should return null when the subscription does not exist", async () => {
      const nonExistentEmail = "nonexistent@example.com";
      const subscription =
        await newsletterSubscriptionRepo.getByEmail(nonExistentEmail);
      expect(subscription).toBeNull();
    });

    it("should return the subscription when it exists", async () => {
      const email = `test_${uuidv()}@example.com`;
      const subscription = new NewsletterSubscription(email);
      await newsletterSubscriptionRepo.create(subscription);

      const found = await newsletterSubscriptionRepo.getByEmail(email);
      expect(found).not.toBeNull();
      expect(found!.email).toEqual(email);
    });
  });

  describe("getAll", () => {
    it("should return all newsletter subscriptions", async () => {
      // Create two unique subscriptions
      const email1 = `test_${uuidv()}@example.com`;
      const email2 = `test_${uuidv()}@example.com`;
      const subscription1 = new NewsletterSubscription(email1);
      const subscription2 = new NewsletterSubscription(email2);

      await newsletterSubscriptionRepo.create(subscription1);
      await newsletterSubscriptionRepo.create(subscription2);

      const allSubscriptions = await newsletterSubscriptionRepo.getAll();

      // Verify that both subscriptions are returned
      expect(allSubscriptions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: email1 }),
          expect.objectContaining({ email: email2 }),
        ]),
      );
    });
  });

  describe("delete", () => {
    it("should delete an existing subscription", async () => {
      const email = `test_${uuidv()}@example.com`;
      const subscription = new NewsletterSubscription(email);
      await newsletterSubscriptionRepo.create(subscription);

      // Delete the subscription
      await newsletterSubscriptionRepo.delete(email);

      // Verify that the subscription is no longer retrievable
      const found = await newsletterSubscriptionRepo.getByEmail(email);
      expect(found).toBeNull();
    });
  });
});
