
import type { Project } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";


async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;

  // 1. Handle network-level failures.
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
     ...options,
     credentials: "include",
    });
  } catch {
    throw new Error(
      "Unable to reach the DevBoard API. Check that the backend is running.",
    );
  }

  // 2. Try to parse the server's JSON response.
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    throw new Error("The API returned an invalid response.");
  }

  // 3. Handle HTTP errors such as 400, 404, and 500.
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status}).`;

    throw new Error(message);
  }

  // 4. Return the successful response.
  return data as T;
}

export async function getProjects(): Promise<Project[]> {
  const data = await request<{ projects: Project[] }>("/api/projects");
  return data.projects;
}

export async function createProject(input: {
  name: string;
  description: string;
  status?: "active" | "completed";
}): Promise<Project> {
  const data = await request<{ project: Project }>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return data.project;
}

export async function updateProject(
  id: number,
  changes: Partial<Pick<Project, "name" | "description" | "status">>,
): Promise<Project> {
  const data = await request<{ project: Project }>(
    `/api/projects/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    },
  );

  return data.project;
}

export async function deleteProject(id: number): Promise<void> {
  await request<{ message: string; id: number }>(
    `/api/projects/${id}`,
    { method: "DELETE" },
  );
}