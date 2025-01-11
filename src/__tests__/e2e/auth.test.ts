import request from "supertest";
import { type Express } from "express";
import { createApp } from "../../createApp";
import { setupTestDB } from "../__helpers__/jest.setup";
import { logger } from "../../config";

describe("/api/v1/auth", () => {
  let app: Express = createApp();

  setupTestDB();

  it("Register", async () => {
    const email = "lauriane@gmail.com";
    const password = "password";

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Lauriane",
        email: email,
        password: password,
      });

    expect(registerResponse.status).toBe(201);

    // should be logged in
    const response = await request(app)
      .get("/api/v1/auth/status")
      .set("Cookie", registerResponse.headers["set-cookie"]);

    // logger.info("Response Body:", response.body);
    // logger.info("Response Status:", response.status);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("success");
    expect(response.body).toHaveProperty("success.user");
    expect(response.body).toHaveProperty("success.user.id");
    expect(response.body).toHaveProperty("success.user.name", "Lauriane");
    expect(response.body).toHaveProperty("success.user.data.email", email);
    expect(response.body).toHaveProperty("success.user.role", "user");
  });

  it("Login", async () => {
    const email = "lauriane@gmail.com";
    const password = "password";

    // create user

    await request(app).post("/api/v1/auth/register").send({
      email: email,
      password: password,
    });

    // login
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: email,
      password: password,
    });

    logger.info("Response Body:", loginResponse.body);
    logger.info("Response Status:", loginResponse.status);

    expect(loginResponse.status).toBe(200);

    // should be logged in

    const response = await request(app)
      .get("/api/v1/auth/status")
      .set("Cookie", loginResponse.headers["set-cookie"]);

    // logger.info("Response Body:", response.body);
    // logger.info("Response Status:", response.status);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("success");
    expect(response.body).toHaveProperty("success.user");
    expect(response.body).toHaveProperty("success.user.id");
    expect(response.body).toHaveProperty("success.user.name", null);
    expect(response.body).toHaveProperty("success.user.data.email", email);
    expect(response.body).toHaveProperty("success.user.role", "user");
  });

  describe("Logout", () => {
    it("can logout when logged-in", async () => {
      const email = "lauriane@gmail.com";
      const password = "password";

      // create user

      await request(app).post("/api/v1/auth/register").send({
        email: email,
        password: password,
      });

      // login
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: email,
        password: password,
      });

      expect(loginResponse.status).toBe(200);

      // logout

      const logoutResponse = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", loginResponse.headers["set-cookie"]);

      expect(logoutResponse.status).toBe(200);

      // should NOT be logged in

      const response = await request(app)
        .get("/api/v1/auth/status")
        .set("Cookie", loginResponse.headers["set-cookie"]);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success.user", null);
    });

    it("can logout when not logged-in", async () => {
      const logoutResponse = await request(app).post("/api/v1/auth/logout");

      expect(logoutResponse.status).toBe(200);
    });
  });
});
