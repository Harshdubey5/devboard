
import { useEffect, useState } from "react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api/projects";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/ProjectCard";
import TaskCard from "../components/TaskCard";
import type { Project, Task } from "../types";

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tasks: Task[] = [
    { id: 1, title: "Build DevBoard dashboard", completed: false },
    { id: 2, title: "Create authentication system", completed: false },
    { id: 3, title: "Connect PostgreSQL database", completed: true },
  ];

  useEffect(() => {
    async function loadProjects() {
      try {
        const projects = await getProjects();
        setProjects(projects);
      } catch {
        setError("Could not load projects. Check that the API is running.");
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {

     const project = await createProject({
       name,
       description,
     });

     setProjects((current) => [...current, project]);

      setName("");
      setDescription("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }


async function handleUpdateProject(
  id: number,
  changes: {
    name: string;
    description: string;
    status: "active" | "completed";
  }
) {
  const updatedProject = await updateProject(id, changes);

  setProjects((currentProjects) =>
    currentProjects.map((project) =>
      project.id === id ? updatedProject : project
    )
  );
}


async function handleDeleteProject(id: number) {
  await deleteProject(id);

  setProjects((currentProjects) =>
    currentProjects.filter((project) => project.id !== id)
  );
}

  return (
    <div>
      <Navbar />

      <div>
        <Sidebar />

        <main>
          <h1>Dashboard</h1>

          <section>
            <h2>Create a Project</h2>

            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="project-description">
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  required
                />
              </div>

              <button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </button>
            </form>

            {error && <p role="alert">{error}</p>}
          </section>

          <section>
            <h2>Projects</h2>

            {loading ? (
              <p>Loading projects...</p>
            ) : projects.length === 0 ? (
              <p>No projects yet. Create your first one above.</p>
            ) : (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUpdate={handleUpdateProject}
                  onDelete={handleDeleteProject}
                  />
              ))
            )}
          </section>

          <section>
            <h2>Recent Tasks</h2>

            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;