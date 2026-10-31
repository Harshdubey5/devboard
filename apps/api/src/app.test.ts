
import "./test-safety.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { like } from "drizzle-orm";
import app from "./app.js";
import { db, pool } from "./db/index.js";
import { users } from "./db/schema.js";

const testPrefix = `devboard-test-${Date.now()}-`;
const password = "TestPassword!123";
const trustedOrigin = "http://localhost:5173";

function newEmail(label: string) {
  return `${testPrefix}${label}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function register(
  agent: ReturnType<typeof request.agent>,
  email = newEmail("user"),
) {
  const response = await agent
    .post("/api/auth/register")
    .set("Origin", trustedOrigin)
    .send({ email, password });

  expect(response.status).toBe(201);
  return { email, user: response.body.user };
}

describe("DevBoard API", () => {
  const userA = request.agent(app);
  const userB = request.agent(app);

  let emailA: string;
  let emailB: string;

  beforeAll(async () => {
    emailA = newEmail("owner");
    emailB = newEmail("other");

    await register(userA, emailA);
    await register(userB, emailB);
  });

  afterAll(async () => {
    // Deleting these users also deletes their projects through the FK cascade.
    await db.delete(users).where(like(users.email, `${testPrefix}%`));

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

  it("rate limits repeated login attempts", async () => {
    process.env.TEST_RATE_LIMIT = "true";

    try {
      const responses = await Promise.all(
        Array.from({ length: 11 }, () =>
          request(app)
            .post("/api/auth/login")
            .set("Origin", trustedOrigin)
            .send({
              email: emailA,
              password: "WrongPassword!123",
            }),
        ),
      );

      expect(responses.filter((response) => response.status === 401)).toHaveLength(10);
      expect(responses.filter((response) => response.status === 429)).toHaveLength(1);

      const limitedResponse = responses.find(
        (response) => response.status === 429,
      );

      expect(limitedResponse?.body.error).toBe(
        "Too many login attempts. Please try again later.",
      );
    } finally {
      delete process.env.TEST_RATE_LIMIT;
    }
  });

  it("rejects project requests from anonymous users", async () => {
    const anonymous = request(app);

    const responses = await Promise.all([
      anonymous.get("/api/projects"),
      anonymous
        .post("/api/projects")
        .set("Origin", trustedOrigin)
        .send({
          name: "Anonymous project",
          description: "Should be rejected",
        }),
      anonymous
        .patch("/api/projects/1")
        .set("Origin", trustedOrigin)
        .send({ name: "Changed" }),
      anonymous
        .delete("/api/projects/1")
        .set("Origin", trustedOrigin),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  it("registers a user without exposing the password hash", async () => {
    const agent = request.agent(app);
    const email = newEmail("registration");

    const response = await agent
      .post("/api/auth/register")
      .set("Origin", trustedOrigin)
      .send({ email, password });

    expect(response.status).toBe(201);
    const sessionCookie = response.headers["set-cookie"];

    expect(sessionCookie).toBeDefined();
    expect(String(sessionCookie)).toContain("devboard.sid=");
    expect(String(sessionCookie)).toMatch(/HttpOnly/i);
    expect(String(sessionCookie)).toMatch(/SameSite=Lax/i);
    expect(String(sessionCookie)).toMatch(/Path=\//i);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.id).toBeTypeOf("number");
    expect(response.body.user.passwordHash).toBeUndefined();

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("rejects duplicate email registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", trustedOrigin)
      .send({ email: emailA, password });

    expect(response.status).toBe(409);
  });

  it("rejects invalid login credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", trustedOrigin)
      .send({ email: emailA, password: "WrongPassword!123" });

    expect(response.status).toBe(401);
  });

  it("logs in a user and establishes a session", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .set("Origin", trustedOrigin)
      .send({ email: emailA, password });

    expect(loginResponse.status).toBe(200);
    const sessionCookie = loginResponse.headers["set-cookie"];

    expect(sessionCookie).toBeDefined();
    expect(String(sessionCookie)).toContain("devboard.sid=");
    expect(String(sessionCookie)).toMatch(/HttpOnly/i);
    expect(String(sessionCookie)).toMatch(/SameSite=Lax/i);
    expect(String(sessionCookie)).toMatch(/Path=\//i);
    const meResponse = await agent.get("/api/auth/me");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe(emailA);
  });

  it("rejects access to the current user endpoint when anonymous", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("creates, lists, updates and deletes a project", async () => {
    const createResponse = await userA
      .post("/api/projects")
      .set("Origin", trustedOrigin)
      .send({
        name: "Automated Test Project",
        description: "Testing the DevBoard CRUD API",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.project.name).toBe("Automated Test Project");
    expect(createResponse.body.project.status).toBe("active");
    expect(createResponse.body.project.ownerId).toBeTypeOf("number");

    const projectId = createResponse.body.project.id;

    const listResponse = await userA.get("/api/projects");
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.projects.some(
        (project: { id: number }) => project.id === projectId,
      ),
    ).toBe(true);

    const updateResponse = await userA
      .patch(`/api/projects/${projectId}`)
      .set("Origin", trustedOrigin)
      .send({ name: "Updated Test Project", status: "completed" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.project.name).toBe("Updated Test Project");
    expect(updateResponse.body.project.description).toBe(
      "Testing the DevBoard CRUD API",
    );
    expect(updateResponse.body.project.status).toBe("completed");

    const deleteResponse = await userA
      .delete(`/api/projects/${projectId}`)
      .set("Origin", trustedOrigin);

    expect(deleteResponse.status).toBe(200);

    const afterDelete = await userA.get("/api/projects");
    expect(
      afterDelete.body.projects.some(
        (project: { id: number }) => project.id === projectId,
      ),
    ).toBe(false);
  });

  it("prevents one user from accessing another user's projects", async () => {
    const createResponse = await userA
      .post("/api/projects")
      .set("Origin", trustedOrigin)
      .send({
        name: "Private Owner Project",
        description: "Only the owner should be able to change this",
      });

    expect(createResponse.status).toBe(201);
    const privateProjectId = createResponse.body.project.id;

    // User B must not see User A's project in their list.
    const listResponse = await userB.get("/api/projects");
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.projects.some(
        (project: { id: number }) => project.id === privateProjectId,
      ),
    ).toBe(false);

    // User B must not update or delete User A's project.
    const updateResponse = await userB
      .patch(`/api/projects/${privateProjectId}`)
      .set("Origin", trustedOrigin)
      .send({ name: "Hijacked project" });

    expect(updateResponse.status).toBe(404);

    const deleteResponse = await userB
      .delete(`/api/projects/${privateProjectId}`)
      .set("Origin", trustedOrigin);

    expect(deleteResponse.status).toBe(404);

    // The original owner still sees the unchanged project.
    const ownerList = await userA.get("/api/projects");
    const originalProject = ownerList.body.projects.find(
      (project: { id: number }) => project.id === privateProjectId,
    );

    expect(originalProject).toBeDefined();
    expect(originalProject.name).toBe("Private Owner Project");
  });

  it("logs out and invalidates the session", async () => {
    const agent = request.agent(app);
    await register(agent);

    const logoutResponse = await agent
      .post("/api/auth/logout")
      .set("Origin", trustedOrigin);

    expect(logoutResponse.status).toBe(200);

    const meResponse = await agent.get("/api/auth/me");
    expect(meResponse.status).toBe(401);
  });

  it("rejects an invalid project ID", async () => {
    const response = await userA
      .patch("/api/projects/abc")
      .set("Origin", trustedOrigin)
      .send({ name: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid project ID.");
  });

  it("returns 404 when updating a nonexistent project", async () => {
    const response = await userA
      .patch("/api/projects/2147483647")
      .set("Origin", trustedOrigin)
      .send({ name: "Updated" });

    expect(response.status).toBe(404);
  });

  it("returns 404 when deleting a nonexistent project", async () => {
    const response = await userA
      .delete("/api/projects/2147483647")
      .set("Origin", trustedOrigin);

    expect(response.status).toBe(404);
  });

  it("rejects an empty project name during an update", async () => {
    const response = await userA
      .patch("/api/projects/2147483647")
      .set("Origin", trustedOrigin)
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects an invalid project status", async () => {
    const response = await userA
      .post("/api/projects")
      .set("Origin", trustedOrigin)
      .send({
        name: "Invalid Status Project",
        description: "This should fail",
        status: "pending",
      });

    expect(response.status).toBe(400);
  });

  it("rejects an update with no fields", async () => {
    const response = await userA
      .patch("/api/projects/2147483647")
      .set("Origin", trustedOrigin)
      .send({});

    expect(response.status).toBe(400);
  });

  it("rejects state-changing requests from an untrusted origin", async () => {
    const response = await userA
      .post("/api/projects")
      .set("Origin", "https://evil.example")
      .send({
        name: "Untrusted Origin Project",
        description: "This must not be created",
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Request origin is not allowed.");

    const listResponse = await userA.get("/api/projects");

    expect(
      listResponse.body.projects.some(
        (project: { name: string }) =>
          project.name === "Untrusted Origin Project",
      ),
    ).toBe(false);
  });

  it("rejects state-changing requests with no origin", async () => {
    const response = await userA
      .post("/api/projects")
      .send({
        name: "Missing Origin Project",
        description: "This must not be created",
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Request origin is not allowed.");
  });

  it("allows safe GET requests without an origin", async () => {
    const response = await userA.get("/api/projects");

    expect(response.status).toBe(200);
    expect(response.body.projects).toBeInstanceOf(Array);
  });

  it("rejects project creation when the request body is missing", async () => {
    const response = await userA
      .post("/api/projects")
      .set("Origin", trustedOrigin);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Name and description are required.",
    );
  });

  it("rejects project updates when the request body is missing", async () => {
    const response = await userA
      .patch("/api/projects/2147483647")
      .set("Origin", trustedOrigin);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Provide at least one field to update.",
    );
  });
});
