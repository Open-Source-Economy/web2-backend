import { Request, Response } from "express";
import { getDowNumberRepository } from "../db/";
import {
  GetAvailableDowBody,
  GetAvailableDowParams,
  GetAvailableDowQuery,
  GetAvailableDowResponse,
  ResponseBody,
} from "../dtos";
import { StatusCodes } from "http-status-codes";
import { CompanyId, UserId } from "../model";
import { ApiError } from "../model/error/ApiError";

const dowNumberRepository = getDowNumberRepository();

export class UserController {
  static async getAvailableDow(
    req: Request<
      GetAvailableDowParams,
      ResponseBody<GetAvailableDowResponse>,
      GetAvailableDowBody,
      GetAvailableDowQuery
    >,
    res: Response<ResponseBody<GetAvailableDowResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const userId: UserId = req.user.id;
    const companyId = req.query.companyId
      ? new CompanyId(req.query.companyId)
      : undefined;

    const dowAmount = await dowNumberRepository.getAvailableMilliDoWs(
      userId,
      companyId,
    );
    const response: GetAvailableDowResponse = {
      dowAmount: dowAmount.toString(),
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }
}
