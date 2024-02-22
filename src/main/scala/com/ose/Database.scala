package com.ose

object Database {
  case class Kitten(id: Long, name: String, gender: String, ageInDays: Int)
  var kittens: List[Kitten] = List(
    Kitten(1L, "mew", "male", 20),
    Kitten(2L, "mews", "female", 25),
    Kitten(3L, "smews", "female", 29)
  )
}
