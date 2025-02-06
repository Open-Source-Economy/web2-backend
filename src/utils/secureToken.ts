import { config, logger } from "../config";
import jwt from "jsonwebtoken";
import { ApiError } from "../model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";

export interface TokenData {
  email?: string;
  userId?: string;
}

export class secureToken {
  /**
   *
   * @param data data email or userId
   * @param setExpiration set expiration date to the token. Depends if the expiration date is verified by the function `verify` (set to true) or not (set to false)   *
   *
   * @returns token and the expiration date
   */
  static generate(
    data: TokenData,
    setExpiration: boolean = false,
  ): [string, Date] {
    const expiresSecond = config.jwt.accessExpirationMinutes * 60;
    const expiresAt = new Date(Date.now() + expiresSecond * 1000);
    const token = jwt.sign(
      {
        exp: setExpiration ? Math.floor(expiresAt.getTime() / 1000) : undefined,
        jti: uuidv4(),
        ...data,
      },
      config.jwt.secret,
    );
    return [token, expiresAt];
  }

  static async verify(token: string): Promise<TokenData> {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenData;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        logger.error(`Token expired:`, err);
        throw new ApiError(StatusCodes.UNAUTHORIZED, `Token expired`);
      } else {
        logger.error(`Invalid token:`, err);
        throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid token`);
      }
    }
  }
}
