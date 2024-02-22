import ose.Library

ThisBuild / version := "0.1.0-SNAPSHOT"

ThisBuild / scalaVersion := "2.13.13"

lazy val root = (project in file("."))
  .settings(
    name := "web2-backend"
  )
  .settings(libraryDependencies ++= Library.Tapir.all)
  .settings(libraryDependencies ++= Library.Typelevel.all)
  .settings(libraryDependencies ++= Library.Miscellaneous.all)

addCommandAlias(
  "fmt",
  "scalafmt"
)