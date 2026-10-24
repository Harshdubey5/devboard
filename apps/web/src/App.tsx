
import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import { getCurrentUser, logout, type User } from "./api/auth";

type AuthState =
  | { status: "checking" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const user = await getCurrentUser();

        if (!cancelled) {
          setAuth({ status: "authenticated", user });
        }
      } catch {
        if (!cancelled) {
          setAuth({ status: "anonymous" });
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthenticated(user: User) {
    setLogoutError("");
    setAuth({ status: "authenticated", user });
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setAuth({ status: "anonymous" });
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Could not log out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (auth.status === "checking") {
    return (
      <main className="app-loading">
        <div className="auth-brand">
          <div className="auth-brand__mark" aria-hidden="true">
            D
          </div>
          <span>DevBoard</span>
        </div>
        <p role="status">Restoring your session...</p>
      </main>
    );
  }

  if (auth.status === "anonymous") {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <>
      {logoutError && (
        <div className="global-error" role="alert">
          {logoutError}
        </div>
      )}
      <Dashboard
        user={auth.user}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </>
  );
}

export default App;
