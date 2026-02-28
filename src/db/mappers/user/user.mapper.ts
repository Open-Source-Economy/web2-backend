import type { User, UserId, UserRole, Currency, Provider, Owner } from "@open-source-economy/api-types";
import { mapOwnerFromRow } from "../github/owner.mapper";

/**
 * Backend-internal extended user type.
 * Contains auth fields that are never exposed via the API.
 */
export interface UserWithAuth extends User {
  email?: string;
  isEmailVerified?: boolean;
  hashedPassword?: string;
  provider?: Provider;
  providerUserId?: string;
  githubOwner?: Owner;
}

/**
 * Map a database row to a UserWithAuth object.
 * The row may come from a JOIN with the github_owner table.
 */
export function mapUserFromRow(row: Record<string, any>, owner: Owner | null = null): UserWithAuth {
  const id = row.id;
  if (!id) throw new Error("Missing user id");

  const user: UserWithAuth = {
    id: id as UserId,
    name: row.name ?? null,
    role: row.role as UserRole,
    preferredCurrency: (row.preferred_currency as Currency) ?? undefined,
    termsAcceptedVersion: row.terms_accepted_version ?? undefined,
  };

  // Local user fields
  if (row.hashed_password) {
    user.email = row.email;
    user.isEmailVerified = row.is_email_verified;
    user.hashedPassword = row.hashed_password;
  }

  // Third-party user fields
  if (row.provider) {
    user.provider = row.provider as Provider;
    user.providerUserId = row.third_party_id;
    user.email = row.email ?? undefined;

    if (owner) {
      user.githubOwner = owner;
    } else if (row.github_login) {
      try {
        user.githubOwner = mapOwnerFromRow(row);
      } catch {
        // Owner data may not be present in all queries
      }
    }
  }

  return user;
}

/**
 * Strip internal auth fields, returning a plain User for API responses.
 */
export function toApiUser(user: UserWithAuth): User {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    preferredCurrency: user.preferredCurrency,
    termsAcceptedVersion: user.termsAcceptedVersion,
  };
}
