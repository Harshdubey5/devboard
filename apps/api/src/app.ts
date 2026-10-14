
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { projects } from "./db/schema.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "DevBoard API is running",
  });
});

app.post("/api/projects", async (req, res, next) => {
  const { name, description, status } = req.body;

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return res.status(400).json({
      error: "Name and description are required.",
    });
  }

  if (
    status !== undefined &&
    status !== "active" &&
    status !== "completed"
  ) {
    return res.status(400).json({
      error: "Status must be active or completed.",
    });
  }

  try {
    const [project] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        description: description.trim(),
        status: status ?? "active",
      })
      .returning();

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid project ID.",
    });
  }

  const { name, description, status } = req.body;

  const updates: {
    name?: string;
    description?: string;
    status?: "active" | "completed";
  } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error: "Name must be a non-empty string.",
      });
    }

    updates.name = name.trim();
  }

  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return res.status(400).json({
        error: "Description must be a non-empty string.",
      });
    }

    updates.description = description.trim();
  }

  if (status !== undefined) {
    if (status !== "active" && status !== "completed") {
      return res.status(400).json({
        error: "Status must be active or completed.",
      });
    }

    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: "Provide at least one field to update.",
    });
  }

  try {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    if (!project) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    return res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid project ID.",
    });
  }

  try {
    const [deletedProject] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });

    if (!deletedProject) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    return res.json({
      message: "Project deleted successfully",
      id: deletedProject.id,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/projects", async (_req, res, next) => {
  try {
    const allProjects = await db.select().from(projects);

    return res.json({ projects: allProjects });
  } catch (error) {
    return next(error);
  }
});

// Handles requests that don't match any route.
app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found.",
  });
});

// Handles errors forwarded by routes and Express middleware.
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  // Malformed JSON sent by a client.
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    res.status(400).json({
      error: "Invalid JSON request body.",
    });
    return;
  }

  // Log the internal error for debugging, but don't expose it to clients.
  console.error("Unexpected API error:", error);

  res.status(500).json({
    error: "Internal server error.",
  });
};

app.use(errorHandler);

export default app;