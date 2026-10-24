
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { getCurrentUser, logout } from "./api/auth";

vi.mock("./api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

vi.mock("./pages/Dashboard", () => ({
  default: ({
    user,
    onLogout,
    loggingOut,
  }: {
    user: { email: string };
    onLogout: () => void;
    loggingOut: boolean;
  }) => (
    <main>
      <h1>Dashboard</h1>
      <p>{user.email}</p>
      <button onClick={onLogout} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : "Log out"}
      </button>
    </main>
  ),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedLogout = vi.mocked(logout);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App authentication flow", () => {
  it("restores an existing session", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      email: "existing@example.com",
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" }))
      .toBeInTheDocument();
    expect(screen.getByText("existing@example.com")).toBeInTheDocument();
  });

  it("shows the login screen when no session exists", async () => {
    mockedGetCurrentUser.mockRejectedValue(new Error("Unauthorized"));

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });

  it("logs out and returns to the login screen", async () => {
    const user = userEvent.setup();

    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      email: "existing@example.com",
    });
    mockedLogout.mockResolvedValue(undefined);

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Log out" }),
    );

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalledOnce();
    });

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });

  it("keeps the dashboard visible when logout fails", async () => {
    const user = userEvent.setup();

    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      email: "existing@example.com",
    });
    mockedLogout.mockRejectedValue(new Error("Network error"));

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Log out" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error",
    );
    expect(screen.getByRole("heading", { name: "Dashboard" }))
      .toBeInTheDocument();
  });

  it("shows a loading state while restoring the session", () => {
    mockedGetCurrentUser.mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Restoring your session...",
    );
  });
});
