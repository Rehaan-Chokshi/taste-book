import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  function handleLogout() {
    logout();
    close();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          🍳 Tastebook
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          <NavLink to="/" end onClick={close}>
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink to="/recipes/new" onClick={close}>
                New recipe
              </NavLink>
              <NavLink to={`/users/${user.id}`} onClick={close}>
                {user.name}
              </NavLink>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>
                Log in
              </NavLink>
              <Link to="/signup" className="btn" onClick={close}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
