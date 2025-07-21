import { ValidationError, Validator } from "../error";
import { UserId } from "../user";

export class DeveloperProfileId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class DeveloperProfile {
  id: DeveloperProfileId;
  userId: UserId;
  name: string;
  email: string;
  githubUsername: string | null;
  termsAccepted: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperProfileId,
    userId: UserId,
    name: string,
    email: string,
    githubUsername: string | null,
    termsAccepted: boolean,
    onboardingCompleted: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.email = email;
    this.githubUsername = githubUsername;
    this.termsAccepted = termsAccepted;
    this.onboardingCompleted = onboardingCompleted;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): DeveloperProfile | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const userId = validator.requiredString("user_id");
    const name = validator.requiredString("name");
    const email = validator.requiredString("email");
    const githubUsername = validator.optionalString("github_username");
    const termsAccepted = validator.requiredBoolean("terms_accepted");
    const onboardingCompleted = validator.requiredBoolean("onboarding_completed");
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new DeveloperProfile(
      new DeveloperProfileId(id),
      new UserId(userId),
      name,
      email,
      githubUsername ?? null,
      termsAccepted,
      onboardingCompleted,
      createdAt,
      updatedAt,
    );
  }
}