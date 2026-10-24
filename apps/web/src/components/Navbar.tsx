
type NavbarProps = {
  email: string;
  onLogout: () => void;
  loggingOut: boolean;
};

function Navbar({ email, onLogout, loggingOut }: NavbarProps) {
  return (
    <header className="app-navbar">
      <a className="app-navbar__brand" href="/" aria-label="DevBoard home">
        <span className="auth-brand__mark" aria-hidden="true">
          D
        </span>
        <span>DevBoard</span>
      </a>

      <div className="app-navbar__account">
        <span className="app-navbar__email">{email}</span>
        <button
          className="button button--secondary"
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Signing out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
