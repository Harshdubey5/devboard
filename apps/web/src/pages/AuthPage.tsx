
import { useState, type FormEvent } from "react";
import { login, register } from "../api/auth";

type AuthPageProps = {
  onAuthenticated: (user: { id: number; email: string }) => void;
};

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const user =
        mode === "login"
          ? await login(normalizedEmail, password)
          : await register(normalizedEmail, password);

      onAuthenticated({ id: user.id, email: user.email });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="auth-brand__mark" aria-hidden="true">
            D
          </div>
          <span>DevBoard</span>
        </div>

        <p className="auth-eyebrow">YOUR WORKSPACE</p>

        <h1 id="auth-title">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        <p className="auth-description">
          {mode === "login"
            ? "Sign in to manage your projects and track your progress."
            : "Create an account to start organizing your projects."}
        </p>

        <div className="auth-tabs" aria-label="Authentication method">
          <button
            type="button"
            className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
            aria-pressed={mode === "login"}
            onClick={() => changeMode("login")}
            disabled={submitting}
          >
            Sign in
          </button>
          <button
            type="button"
            className={
              mode === "register"
                ? "auth-tab auth-tab--active"
                : "auth-tab"
            }
            aria-pressed={mode === "register"}
            onClick={() => changeMode("register")}
            disabled={submitting}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder={
                mode === "register"
                  ? "At least 12 characters"
                  : "Enter your password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "register" ? 12 : undefined}
              maxLength={128}
              required
              disabled={submitting}
            />
            {mode === "register" && (
              <p className="auth-hint">
                Use at least 12 characters.
              </p>
            )}
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="button button--primary auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Your projects are private to your account.
        </p>
      </section>
    </main>
  );
}

export default AuthPage;
