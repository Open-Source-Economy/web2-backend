package com.ose

import sttp.model.StatusCode

import scala.concurrent.Future

object Server {
  def getKittens =
    MyEndpoints.kittens
      .serverLogic(_ => {
        Future.successful[Either[StatusCode, MyEndpoints.Response]](Right(MyEndpoints.Response(Database.kittens)))
      })
}
