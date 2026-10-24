export type User = {
  id: number;
  email: string;
  createdAt?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function authRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;

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

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    throw new Error("The API returned an invalid response.");
  }

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

  return data as T;
}

export async function register(
  email: string,
  password: string,
): Promise<User> {
  const data = await authRequest<{ user: User }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const data = await authRequest<{ user: User }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function getCurrentUser(): Promise<User> {
  const data = await authRequest<{ user: User }>("/api/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await authRequest<{ message: string }>("/api/auth/logout", {
    method: "POST",
  });
}