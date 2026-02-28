import { config } from "../config";

const bcrypt = require("bcryptjs");

export class encrypt {
  static async hashPassword(password: string) {
    const salt = bcrypt.genSaltSync(config.encrypt.saltRounds);
    return bcrypt.hashSync(password, salt);
  }

  static comparePassword(password: string, hashPassword: string): boolean {
    return bcrypt.compareSync(password, hashPassword);
  }
}
