import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "./AuthPage";
import { login, register } from "../api/auth";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

const mockedLogin = vi.mocked(login);
const mockedRegister = vi.mocked(register);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AuthPage", () => {
  it("logs in and passes the authenticated user to the app", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    mockedLogin.mockResolvedValue({
      id: 1,
      email: "test@example.com",
    });

    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      " TEST@example.com ",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "correct-password",
    );

    const form = screen.getByLabelText(/email address/i).closest("form")!;

    await user.click(
      within(form).getByRole("button", { name: "Sign in" }),
    );

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith(
        "test@example.com",
        "correct-password",
      );
      expect(onAuthenticated).toHaveBeenCalledWith({
        id: 1,
        email: "test@example.com",
      });
    });
  });

  it("registers a new user", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    mockedRegister.mockResolvedValue({
      id: 2,
      email: "new@example.com",
    });

    render(<AuthPage onAuthenticated={onAuthenticated} />);

    // Click the registration tab (the first matching button).
    await user.click(
      screen.getAllByRole("button", { name: "Create account" })[0],
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "new@example.com",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "a-very-secure-password",
    );

    const form = screen.getByLabelText(/email address/i).closest("form")!;

    // Click the submit button inside the form.
    await user.click(
      within(form).getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith(
        "new@example.com",
        "a-very-secure-password",
      );
      expect(onAuthenticated).toHaveBeenCalledWith({
        id: 2,
        email: "new@example.com",
      });
    });
  });

  it("shows an error when login fails", async () => {
    const user = userEvent.setup();

    mockedLogin.mockRejectedValue(
      new Error("Invalid email or password."),
    );

    render(<AuthPage onAuthenticated={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "wrong-password",
    );

    const form = screen.getByLabelText(/email address/i).closest("form")!;

    await user.click(
      within(form).getByRole("button", { name: "Sign in" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );
  });

  it("shows an error when registration fails", async () => {
    const user = userEvent.setup();

    mockedRegister.mockRejectedValue(
      new Error("Email already exists."),
    );

    render(<AuthPage onAuthenticated={vi.fn()} />);

    await user.click(
      screen.getAllByRole("button", { name: "Create account" })[0],
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "existing@example.com",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "a-very-secure-password",
    );

    const form = screen.getByLabelText(/email address/i).closest("form")!;

    await user.click(
      within(form).getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already exists.",
    );
  });

  it("disables the submit button while the request is pending", async () => {
    const user = userEvent.setup();

    let resolveLogin!: (value: {
      id: number;
      email: string;
    }) => void;

    mockedLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<AuthPage onAuthenticated={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    await user.type(
      screen.getByLabelText(/password/i),
      "some-password",
    );

    const form = screen.getByLabelText(/email address/i).closest("form")!;

    await user.click(
      within(form).getByRole("button", { name: "Sign in" }),
    );

    expect(
      await screen.findByRole("button", { name: "Please wait..." }),
    ).toBeDisabled();

    resolveLogin({
      id: 1,
      email: "test@example.com",
    });

    await waitFor(() => {
      expect(
        within(form).getByRole("button", { name: "Sign in" }),
      ).toBeEnabled();
    });
  });
});