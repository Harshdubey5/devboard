
// import express from "express";
// import cors from "cors";
// import { eq } from "drizzle-orm";
// import { db, pool } from "./db/index.js";
// import { projects } from "./db/schema.js";

// const app = express();

// app.use(cors({ origin: "http://localhost:5173" }));
// app.use(express.json());

// app.get("/api/health", (_req, res) => {
//   res.json({
//     status: "ok",
//     message: "DevBoard API is running",
//   });
// });

// app.post("/api/projects", async (req, res) => {
//   const { name, description, status } = req.body;

//   if (
//     typeof name !== "string" ||
//     name.trim().length === 0 ||
//     typeof description !== "string" ||
//     description.trim().length === 0
//   ) {
//     return res.status(400).json({
//       error: "Name and description are required.",
//     });
//   }

//   if (
//     status !== undefined &&
//     status !== "active" &&
//     status !== "completed"
//   ) {
//     return res.status(400).json({
//       error: "Status must be active or completed.",
//     });
//   }

//   try {
//     const [project] = await db
//       .insert(projects)
//       .values({
//         name: name.trim(),
//         description: description.trim(),
//         status: status ?? "active",
//       })
//       .returning();

//     return res.status(201).json({
//       message: "Project created successfully",
//       project,
//     });
//   } catch (error) {
//     console.error("Failed to create project:", error);

//     return res.status(500).json({
//       error: "Failed to create project.",
//     });
//   }
// });


// app.patch("/api/projects/:id", async (req, res) => {
//   const id = Number(req.params.id);

//   if (!Number.isSafeInteger(id) || id <= 0) {
//     return res.status(400).json({
//       error: "Invalid project ID.",
//     });
//   }

//   const { name, description, status } = req.body;
//   const updates: {
//     name?: string;
//     description?: string;
//     status?: "active" | "completed";
//   } = {};

//   if (name !== undefined) {
//     if (typeof name !== "string" || name.trim().length === 0) {
//       return res.status(400).json({
//         error: "Name must be a non-empty string.",
//       });
//     }

//     updates.name = name.trim();
//   }

//   if (description !== undefined) {
//     if (
//       typeof description !== "string" ||
//       description.trim().length === 0
//     ) {
//       return res.status(400).json({
//         error: "Description must be a non-empty string.",
//       });
//     }

//     updates.description = description.trim();
//   }

//   if (status !== undefined) {
//     if (status !== "active" && status !== "completed") {
//       return res.status(400).json({
//         error: "Status must be active or completed.",
//       });
//     }

//     updates.status = status;
//   }

//   if (Object.keys(updates).length === 0) {
//     return res.status(400).json({
//       error: "Provide at least one field to update.",
//     });
//   }

//   try {
//     const [project] = await db
//       .update(projects)
//       .set(updates)
//       .where(eq(projects.id, id))
//       .returning();

//     if (!project) {
//       return res.status(404).json({
//         error: "Project not found.",
//       });
//     }

//     return res.json({
//       message: "Project updated successfully",
//       project,
//     });
//   } catch (error) {
//     console.error("Failed to update project:", error);

//     return res.status(500).json({
//       error: "Failed to update project.",
//     });
//   }
// });

// app.delete("/api/projects/:id", async (req, res) => {
//   const id = Number(req.params.id);

//   if (!Number.isSafeInteger(id) || id <= 0) {
//     return res.status(400).json({
//       error: "Invalid project ID.",
//     });
//   }

//   try {
//     const [deletedProject] = await db
//       .delete(projects)
//       .where(eq(projects.id, id))
//       .returning({ id: projects.id });

//     if (!deletedProject) {
//       return res.status(404).json({
//         error: "Project not found.",
//       });
//     }

//     return res.json({
//       message: "Project deleted successfully",
//       id: deletedProject.id,
//     });
//   } catch (error) {
//     console.error("Failed to delete project:", error);

//     return res.status(500).json({
//       error: "Failed to delete project.",
//     });
//   }
// });

// app.get("/api/projects", async (_req, res) => {
//   try {
//     const allProjects = await db.select().from(projects);

//     return res.json({ projects: allProjects });
//   } catch (error) {
//     console.error("Failed to fetch projects:", error);

//     return res.status(500).json({
//       error: "Failed to fetch projects.",
//     });
//   }
// });

// const PORT = 4000;

// const server = app.listen(PORT, () => {
//   console.log(`DevBoard API running on http://localhost:${PORT}`);
// });

// function shutdown() {
//   server.close(() => {
//     void pool.end().then(() => {
//       process.exit(0);
//     });
//   });
// }

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);



import app from "./app.js";
import { pool } from "./db/index.js";

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`DevBoard API listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => {
    void pool.end().then(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
