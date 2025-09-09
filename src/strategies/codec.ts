import passport from "passport";
import { getUserRepository, UserRepository } from "../db/";
import { User, UserId } from "@open-source-economy/api-types";

const userRepository: UserRepository = getUserRepository();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

// id passed to deserializeUser is the id returned from serializeUser
passport.deserializeUser(async (id, done) => {
  try {
    const user: User | null = await userRepository.getById(id as UserId);
    user ? done(null, user) : done(new Error("User Not Found"));
  } catch (err) {
    done(err, null);
  }
});

export default passport;
