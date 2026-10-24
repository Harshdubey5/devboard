import { useCallback, useEffect, useState } from "react";
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
import type { User } from "../api/auth";

type DashboardProps = {
  user: User;
  onLogout: () => void;
  loggingOut: boolean;
};

function Dashboard({ user, onLogout, loggingOut }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");

  const tasks: Task[] = [
    { id: 1, title: "Build DevBoard dashboard", completed: false },
    { id: 2, title: "Create authentication system", completed: false },
    { id: 3, title: "Connect PostgreSQL database", completed: true },
  ];


const loadProjects = useCallback(async (showLoading = true) => {
  if (showLoading) {
    setLoading(true);
  }

  setLoadError("");

  try {
    const loadedProjects = await getProjects();
    setProjects(loadedProjects);
  } catch (error) {
    setLoadError(
      error instanceof Error
        ? error.message
        : "Could not load projects. Please try again.",
    );
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    void loadProjects();
  }, 0);

  return () => clearTimeout(timeoutId);
}, [loadProjects]);


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setCreateError("");
    setSubmitting(true);

    try {
      const project = await createProject({ name, description });

      setProjects((current) => [...current, project]);
      setName("");
      setDescription("");
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not create the project. Please try again.",
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
    },
  ): Promise<void> {
    const updatedProject = await updateProject(id, changes);

    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === id ? updatedProject : project,
      ),
    );
  }

  async function handleDeleteProject(id: number): Promise<void> {
    await deleteProject(id);

    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== id),
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        email={user.email}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      <div className="dashboard-layout">
        <Sidebar />

        <main className="dashboard-main">
          <div className="dashboard-heading">
            <div>
              <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
              <h1>Dashboard</h1>
              <p className="dashboard-subtitle">
                Keep your projects organized and moving forward.
              </p>
            </div>
          </div>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Create a project</h2>
                <p>Start something new and give your work a home.</p>
              </div>
            </div>

            <form className="create-project-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Website redesign"
                  required
                  minLength={1}
                  maxLength={120}
                  disabled={submitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-description">Description</label>
                <textarea
                  id="project-description"
                  className="form-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What are you planning to build?"
                  required
                  disabled={submitting}
                  rows={3}
                />
              </div>

              <div className="create-project-footer">
                <p>You'll be able to edit the details later.</p>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "＋ Create project"}
                </button>
              </div>

              {createError && (
                <p className="form-error" role="alert">
                  {createError}
                </p>
              )}
            </form>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>My projects</h2>
                <p>Your projects in one place.</p>
              </div>
              {!loading && !loadError && (
                <span className="section-count">
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </span>
              )}
            </div>

            {loading ? (
              <p role="status">Loading projects...</p>
            ) : loadError ? (
              <div className="dashboard-message">
                <p role="alert">{loadError}</p>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => void loadProjects()}
                >
                  Try again
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden="true">
                  ▦
                </div>
                <h3>No projects yet</h3>
                <p>Create your first project above to get started.</p>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onUpdate={handleUpdateProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Recent tasks</h2>
                <p>A preview of what you're working on.</p>
              </div>
            </div>

            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;