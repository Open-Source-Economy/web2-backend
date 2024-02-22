package com.ose

trait MyError {
  def message: String

  final case class Error(message: String) extends MyError
}
