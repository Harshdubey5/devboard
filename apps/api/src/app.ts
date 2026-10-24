
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import argon2 from "argon2";
import { and, eq } from "drizzle-orm";
import { db, pool } from "./db/index.js";
import { projects, users } from "./db/schema.js";

const app = express();
const PgSession = connectPgSimple(session);
const frontendOrigin =
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const sessionSecret = process.env.SESSION_SECRET;
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

app.use((req, res, next) => {
  if (safeMethods.has(req.method)) {
    return next();
  }

  const origin = req.get("Origin");

  if (!origin || origin !== frontendOrigin) {
    return res.status(403).json({
      error: "Request origin is not allowed.",
    });
  }

  next();
});

app.use(express.json());

app.use(
  session({
    name: "devboard.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
     cookie: {
      ...sessionCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
     },
  }),
);

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "DevBoard API is running",
  });
});

// Register a user.
app.post("/api/auth/register", async (req, res, next) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body?.password;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return res.status(400).json({
      error: "Password must be between 12 and 128 characters.",
    });
  }

  try {
    const passwordHash = await argon2.hash(password);

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
      .onConflictDoNothing({ target: users.email })
      .returning({
        id: users.id,
        email: users.email,
      });

    if (!user) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.userId = user.id;

      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        return res.status(201).json({ user });
      });
    });
  } catch (error) {
    next(error);
  }
});

// Log in with an existing account.
app.post("/api/auth/login", async (req, res, next) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body?.password;

  if (
    !email ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 128
  ) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.userId = user.id;

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        return res.json({
          user: { id: user.id, email: user.email },
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// Restore the current session after a page refresh.
app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, req.session.userId!))
      .limit(1);

    if (!user) {
      return req.session.destroy(() => {
        res.clearCookie("devboard.sid", sessionCookieOptions);
        res.status(401).json({ error: "Authentication required." });
      });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Log out and invalidate the server-side session.
app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("devboard.sid", sessionCookieOptions);

    return res.json({ message: "Logged out successfully." });
  });
});

// All project endpoints below require authentication.

// Create a project owned by the current user.
app.post("/api/projects", requireAuth, async (req, res, next) => {
  const { name, description, status } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    return res.status(400).json({
      error: "Name and description are required.",
    });
  }

  if (status !== undefined && status !== "active" && status !== "completed") {
    return res.status(400).json({
      error: "Status must be active or completed.",
    });
  }

  try {
    const [project] = await db
      .insert(projects)
      .values({
        ownerId: req.session.userId!,
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
    next(error);
  }
});

// Update only a project owned by the current user.
app.patch("/api/projects/:id", requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  const { name, description, status } = req.body;
  const updates: {
    name?: string;
    description?: string;
    status?: "active" | "completed";
  } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "Name must be a non-empty string.",
      });
    }
    updates.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
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
      .where(
        and(
          eq(projects.id, id),
          eq(projects.ownerId, req.session.userId!),
        ),
      )
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    return res.json({ message: "Project updated successfully", project });
  } catch (error) {
    next(error);
  }
});

// Delete only a project owned by the current user.
app.delete("/api/projects/:id", requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  try {
    const [deletedProject] = await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.ownerId, req.session.userId!),
        ),
      )
      .returning({ id: projects.id });

    if (!deletedProject) {
      return res.status(404).json({ error: "Project not found." });
    }

    return res.json({
      message: "Project deleted successfully",
      id: deletedProject.id,
    });
  } catch (error) {
    next(error);
  }
});

// List only the current user's projects.
app.get("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, req.session.userId!));

    return res.json({ projects: allProjects });
  } catch (error) {
    next(error);
  }
});

// Unknown routes.
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Centralized error handling.
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    res.status(400).json({ error: "Invalid JSON request body." });
    return;
  }

  console.error("Unexpected API error:", error);
  res.status(500).json({ error: "Internal server error." });
};

app.use(errorHandler);

export default app;
