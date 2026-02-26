import passport from "passport";
import { getUserRepository, UserRepository } from "../db/";
import { User, UserId } from "@open-source-economy/api-types";

const userRepository: UserRepository = getUserRepository();

passport.serializeUser((user, done) => {
  done(null, (user as any).id);
});

// id passed to deserializeUser is the id returned from serializeUser.
// Legacy sessions may contain the old class-based format { uuid: "..." }
// instead of a plain string, so we normalise before querying.
passport.deserializeUser(async (id, done) => {
  try {
    const userId: UserId =
      typeof id === "object" && id !== null && "uuid" in (id as any)
        ? ((id as any).uuid as UserId)
        : (id as UserId);
    const user: User | null = await userRepository.getById(userId);
    user ? done(null, user) : done(new Error("User Not Found"));
  } catch (err) {
    done(err, null);
  }
});

export default passport;
