package com.ose

import com.ose.Database.Kitten
import sttp.model.StatusCode
import sttp.tapir.{endpoint, statusCode, Endpoint, Schema}
import sttp.tapir.json.circe.jsonBody

object MyEndpoints {

  final case class Request()
  final case class Response(
      @Schema.annotations.description("The cutest kittens in the world.")
      kittens: List[Kitten]
  )

  val kittens: Endpoint[Unit, Request, StatusCode, Response, Any] = {
    val responseExample = Response(Database.kittens)

    endpoint
      .get
      .in("kitten")
      .mapInTo[Request]
      .errorOut(statusCode)
//      .errorOut(statusCode and jsonBody[MyError]) TODO
      .out(jsonBody[Response].example(responseExample))
  }

}
