package com.ose

import com.typesafe.config.Config

final case class ApplicationConfig(host: String, port: Int)

object ApplicationConfig {
  def load(config: Config): ApplicationConfig =
    ApplicationConfig(config.getString("host"), config.getInt("port"))
}
