

import "./test-safety.js";

import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "./app.js";
import { db, pool } from "./db/index.js";
import { projects } from "./db/schema.js";

describe("DevBoard API", () => {
  let createdProjectId: number | undefined;

  afterAll(async () => {
    // Clean up the test record if a test failed before deleting it.
    if (createdProjectId !== undefined) {
      await db
        .delete(projects)
        .where(eq(projects.id, createdProjectId));
    }

    await pool.end();
  });

  it("returns a healthy API status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "DevBoard API is running",
    });
  });

  it("rejects a project without a name", async () => {
    const response = await request(app)
      .post("/api/projects")
      .send({
        description: "A project created by an automated test",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Name and description are required.",
    );
  });

  it("creates, lists, updates and deletes a project", async () => {
    // 1. Create a project.
    const createResponse = await request(app)
      .post("/api/projects")
      .send({
        name: "Automated Test Project",
        description: "Testing the DevBoard CRUD API",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.project.name).toBe(
      "Automated Test Project",
    );
    expect(createResponse.body.project.status).toBe("active");

    createdProjectId = createResponse.body.project.id;

    // 2. Confirm the project appears in the list.
    const listResponse = await request(app).get("/api/projects");

    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.projects.some(
        (project: { id: number }) =>
          project.id === createdProjectId,
      ),
    ).toBe(true);

    // 3. Update the project.
    const updateResponse = await request(app)
      .patch(`/api/projects/${createdProjectId}`)
      .send({
        name: "Updated Test Project",
        status: "completed",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.project.name).toBe(
      "Updated Test Project",
    );
    expect(updateResponse.body.project.description).toBe(
      "Testing the DevBoard CRUD API",
    );
    expect(updateResponse.body.project.status).toBe("completed");

    // 4. Delete the project.
    const deleteResponse = await request(app).delete(
      `/api/projects/${createdProjectId}`,
    );

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.id).toBe(createdProjectId);

    // The record is deleted, so cleanup is no longer necessary.
    createdProjectId = undefined;

    // 5. Confirm the deleted project is absent from the list.
    const finalListResponse = await request(app).get("/api/projects");

    expect(finalListResponse.status).toBe(200);
    expect(
      finalListResponse.body.projects.some(
        (project: { id: number }) =>
          project.id === createResponse.body.project.id,
      ),
    ).toBe(false);
  });

  it("rejects an invalid project ID", async () => {
    const response = await request(app).patch("/api/projects/abc").send({
      name: "Updated project",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid project ID.");
  });

  it("returns 404 when updating a nonexistent project", async () => {
    const response = await request(app)
      .patch("/api/projects/2147483647")
      .send({
        name: "Updated project",
      });

    expect(response.status).toBe(404);
  });

  it("returns 404 when deleting a nonexistent project", async () => {
    const response = await request(app).delete(
      "/api/projects/2147483647",
    );

    expect(response.status).toBe(404);
  });

  it("rejects an empty project name during an update", async () => {
    const response = await request(app)
      .patch("/api/projects/2147483647")
      .send({
        name: "   ",
      });

    expect(response.status).toBe(400);
  });

  it("rejects an invalid project status", async () => {
    const response = await request(app)
      .post("/api/projects")
      .send({
        name: "Invalid Status Project",
        description: "This request should be rejected",
        status: "pending",
      });

    expect(response.status).toBe(400);
  });

  it("rejects an update with no fields", async () => {
    const response = await request(app)
      .patch("/api/projects/2147483647")
      .send({});

    expect(response.status).toBe(400);
  });

});