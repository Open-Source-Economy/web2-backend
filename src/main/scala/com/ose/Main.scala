package com.ose

import akka.actor.{ActorSystem, CoordinatedShutdown}
import cats.effect.{ExitCode, IO, IOApp}
import com.typesafe.scalalogging.StrictLogging
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter
import sttp.tapir.swagger.bundle.SwaggerInterpreter

import scala.concurrent.{ExecutionContextExecutor, Future}
import scala.concurrent.duration.DurationInt

object Main extends IOApp with StrictLogging {

  implicit val system: ActorSystem           = ActorSystem("system")
  implicit val _ec: ExecutionContextExecutor = system.dispatcher

  val config = ApplicationConfig.load(system.settings.config)

  //  val prometheusMetrics: PrometheusMetrics[Future] = PrometheusMetrics.default[Future]()
  //  val metricsEndpoint: ServerEndpoint[Any, Future] = prometheusMetrics.metricsEndpoint

  private val apiEndpoints: List[ServerEndpoint[Any, Future]] = List(Server.getKittens)
  private val docEndpoints: List[ServerEndpoint[Any, Future]] = SwaggerInterpreter().fromServerEndpoints[Future](apiEndpoints, "Open Source Economy", "1.0.0")
  private val endpoints                                       = apiEndpoints ++ docEndpoints

  def run(args: List[String]): IO[ExitCode] = {
    val start = for {
      route <- IO.pure {
                 AkkaHttpServerInterpreter().toRoute(endpoints)
               }
      _ <- BaseServer.fromAkkaHttp[IO](route, config.host, config.port)
             .flatTap(binding => IO(binding.addToCoordinatedShutdown(3.second)))
    } yield ()

    start
      .handleErrorWith(shutdown("Server startup failed"))
      .background
      .useForever
  }

  private def shutdown(msg: String)(cause: Throwable): IO[Unit] =
    IO.delay {
      logger.error(msg, cause)
      CoordinatedShutdown(system).run(CoordinatedShutdown.unknownReason)
    }
}
