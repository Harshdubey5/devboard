import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav aria-label="Main navigation">
        <p className="sidebar__label">WORKSPACE</p>

        <ul className="sidebar__nav">
          <li>
            <span
              className="sidebar__item sidebar__item--active"
              aria-current="page"
            >
              <span className="sidebar__icon" aria-hidden="true">
                ◫
              </span>
              Dashboard
            </span>
          </li>

          <li>
            <span className="sidebar__item">
              <span className="sidebar__icon" aria-hidden="true">
                ▦
              </span>
              My Projects
            </span>
          </li>

          <li>
            <span className="sidebar__item">
              <span className="sidebar__icon" aria-hidden="true">
                ✓
              </span>
              My Tasks
            </span>
          </li>

          <li>
            <span className="sidebar__item">
              <span className="sidebar__icon" aria-hidden="true">
                ⚙
              </span>
              Settings
            </span>
          </li>
        </ul>
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__footer-mark">D</span>
        <div>
          <strong>DevBoard</strong>
          <p>Project workspace</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;