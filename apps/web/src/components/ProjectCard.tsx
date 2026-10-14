
import { useState } from "react";
import type { Project } from "../types";

type ProjectCardProps = {
  project: Project;
  onUpdate: (
    id: number,
    changes: {
      name: string;
      description: string;
      status: "active" | "completed";
    },
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function ProjectCard({
  project,
  onUpdate,
  onDelete,
}: ProjectCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(
    project.description,
  );
  const [status, setStatus] = useState<
    "active" | "completed"
  >(project.status);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const busy = saving || deleting;

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setSaving(true);

    try {
      await onUpdate(project.id, {
        name: name.trim(),
        description: description.trim(),
        status,
      });

      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update this project. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (busy) return;

    const confirmed = window.confirm(
      `Delete "${project.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setDeleting(true);

    try {
      await onDelete(project.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete this project. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    if (busy) return;

    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setError("");
    setEditing(false);
  }

  function handleEdit() {
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setError("");
    setEditing(true);
  }

  return (
    <article className="project-card">
      {editing ? (
        <form className="project-card__form" onSubmit={handleSave}>
          <div className="form-field">
            <label htmlFor={`name-${project.id}`}>
              Project name
            </label>
            <input
              id={`name-${project.id}`}
              className="form-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={1}
              maxLength={120}
              disabled={busy}
            />
          </div>

          <div className="form-field">
            <label htmlFor={`description-${project.id}`}>
              Description
            </label>
            <textarea
              id={`description-${project.id}`}
              className="form-input"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              required
              disabled={busy}
              rows={3}
            />
          </div>

          <div className="form-field">
            <label htmlFor={`status-${project.id}`}>
              Status
            </label>
            <select
              id={`status-${project.id}`}
              className="form-input"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as "active" | "completed",
                )
              }
              disabled={busy}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="project-card__actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={busy}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <button
              className="button button--secondary"
              type="button"
              onClick={handleCancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="project-card__header">
            <h3 className="project-card__title">
              {project.name}
            </h3>

            <span
              className={`status-badge status-badge--${project.status}`}
            >
              {project.status === "active" ? "Active" : "Completed"}
            </span>
          </div>

          <p className="project-card__description">
            {project.description}
          </p>

          <div className="project-card__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleEdit}
              disabled={busy}
            >
              Edit
            </button>

            <button
              className="button button--danger"
              type="button"
              onClick={handleDelete}
              disabled={busy}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

export default ProjectCard;