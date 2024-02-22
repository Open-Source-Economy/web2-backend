package ose

import sbt._

object Library {

  object Tapir {
    val org: String = "com.softwaremill.sttp.tapir"
    val version: String = "1.9.10"

    val core: ModuleID = org %% "tapir-core" % version
    val jsonCirce: ModuleID = org %% "tapir-json-circe" % version
    val akkaHttpServer: ModuleID = org %% "tapir-akka-http-server" % version
    val client: ModuleID = org %% "tapir-sttp-client" % version
    val swagger: ModuleID = org %% "tapir-swagger-ui-bundle" % version

    val all: Seq[sbt.ModuleID] = Seq(core, jsonCirce, akkaHttpServer, client, swagger)
  }

  object Typelevel {
    val org: String = "org.typelevel"
    val version: String = "3.5.3"

    val catsEffect: ModuleID = org %% "cats-effect" % version

    val all: Seq[sbt.ModuleID] = Seq(catsEffect)
  }

  object Plugin {
    // Find a way to add the plugins of the plugins.sbt file here
//    val scalafix: ModuleID = "ch.epfl.scala" % "sbt-scalafix" % "0.10.4" // https://github.com/scalacenter/sbt-scalafix/releases
//    val scalafmt: ModuleID = "org.scalameta" % "sbt-scalafmt" % "2.5.0" // https://github.com/scalameta/sbt-scalafmt/releases
  }

  object Miscellaneous {
    val scalaLogging = "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5"
    val logback =   "ch.qos.logback" % "logback-classic" % "1.4.14"

    val all: Seq[sbt.ModuleID] = Seq(scalaLogging, logback)
  }
}