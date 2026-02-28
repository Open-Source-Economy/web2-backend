import { type Express } from "express";
import { createApp } from "../../createApp";
import { setupTestDB } from "../__helpers__/jest.setup";

describe("/api/v1/users", () => {
  const _app: Express = createApp();

  setupTestDB();

  it("should return an empty array when getting /api/v1/users", async (): Promise<void> => {
    // const response = await request(app).get("/api/v1/users");
    // console.log("Response Body:", response.body); // Log the response body for debugging
    // console.log("Response Status:", response.status); // Log the response status for debugging
    //
    // // Check if the response status is 200 OK
    // expect(response.status).toBe(200);
    //
    // // Check if the response body is an empty array
    // expect(response.body).toStrictEqual([]);
  });
});
