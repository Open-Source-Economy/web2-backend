import { setupTestDB } from "../__helpers__/jest.setup";
import {
  getOwnerRepository,
  getRepositoryRepository,
  getUserRepository,
  getUserRepositoryRepository,
} from "../../db";
import { Fixture } from "../__helpers__/Fixture";
import { Currency, RepositoryUserRole, UserId } from "../../model";

describe("UserRepositoryRepository", () => {
  const userRepo = getUserRepository();
  const ownerRepo = getOwnerRepository();
  const repositoryRepo = getRepositoryRepository();
  const userRepositoryRepo = getUserRepositoryRepository();

  setupTestDB();
  let userId: UserId;
  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    userId = validUser.id;

    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
  });

  describe("create", () => {
    it("should create a new user repository record", async () => {
      const userRepository = Fixture.userRepository(userId, repositoryId);
      const created = await userRepositoryRepo.create(userRepository);
      expect(created.repositoryId).toEqual(repositoryId);
    });
  });

  describe("getById", () => {
    it("should return the user repository by user id and repository id", async () => {
      const userRepository = Fixture.userRepository(userId, repositoryId);
      await userRepositoryRepo.create(userRepository);
      const found = await userRepositoryRepo.getById(userId, repositoryId);
      expect(found).not.toBeNull();
      expect(found!.repositoryId).toEqual(repositoryId);
    });
  });

  describe("update", () => {
    it("should update an existing user repository record", async () => {
      const userRepository = Fixture.userRepository(userId, repositoryId);
      const created = await userRepositoryRepo.create(userRepository);

      created.repositoryUserRole = RepositoryUserRole.ADMIN;
      const updated = await userRepositoryRepo.update(created);
      expect(updated.repositoryUserRole).toEqual(RepositoryUserRole.ADMIN);
    });
  });

  describe("delete", () => {
    it("should delete a user repository record", async () => {
      const userRepository = Fixture.userRepository(userId, repositoryId);
      await userRepositoryRepo.create(userRepository);
      await userRepositoryRepo.delete(userId, repositoryId);
      const found = await userRepositoryRepo.getById(userId, repositoryId);
      expect(found).toBeNull();
    });
  });

  it("should update the preferred currency for a user", async () => {
    // Ensure the initial preferred currency is null
    const userBeforeUpdate = await userRepo.getById(userId);
    expect(userBeforeUpdate).not.toBeNull();
    expect(userBeforeUpdate!.preferredCurrency).toBeUndefined()

    // Update the preferred currency
    const newCurrency = Currency.EUR;
    await userRepo.setPreferredCurrency(userId, newCurrency);

    // Verify the preferred currency was updated
    const userAfterUpdate = await userRepo.getById(userId);
    expect(userAfterUpdate).not.toBeUndefined();
    expect(userAfterUpdate!.preferredCurrency).toEqual(newCurrency);
  });

  it("should throw an error if the user does not exist", async () => {
    const invalidUserId = Fixture.userId()
    const newCurrency = Currency.USD;

    await expect(
      userRepo.setPreferredCurrency(invalidUserId, newCurrency),
    ).rejects.toThrowError(`User with id ${invalidUserId.uuid} not found`);
  });
});
