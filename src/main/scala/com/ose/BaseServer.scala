package com.ose

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import cats.effect.{Async, Sync}
import cats.implicits._
import com.typesafe.scalalogging.StrictLogging

object BaseServer extends StrictLogging {

  def fromAkkaHttp[F[_]: Async](route: Route, interface: String, port: Int)(implicit system: ActorSystem): F[Http.ServerBinding] =
    Async[F]
      .fromFuture(
        Sync[F].delay(
          Http().newServerAt(interface, port).bind(Route.toFunction(route))
        )
      ).flatTap { binding =>
        Sync[F].delay {
          logger.info(s"Server online at http://$interface:$port/")
        }
      }

}
