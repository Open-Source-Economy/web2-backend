import {
  GetPricesBody,
  GetPricesParams,
  GetPricesQuery,
  GetPricesResponse,
  ResponseBody,
} from "../../api/dto";
import { Request, Response } from "express";

export class StripeController {
  static async getPrices(
    req: Request<
      GetPricesParams,
      ResponseBody<GetPricesResponse>,
      GetPricesBody,
      GetPricesQuery
    >,
    res: Response<ResponseBody<GetPricesResponse>>,
  ) {
    //
    //
    // const response: GetPricesResponse = {
    //   prices,
    // };
    // res.status(StatusCodes.OK).send({
    //   success: response,
    // });
  }
}
