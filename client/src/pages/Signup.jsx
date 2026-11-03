import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Same rules as the server, so most mistakes are caught before a request is sent
    const errors = {};
    if (name.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!EMAIL_REGEX.test(email.trim())) errors.email = "Enter a valid email address";
    if (password.length < 6) errors.password = "Password must be at least 6 characters";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      // The server can still reject (e.g. email already registered)
      if (err.details) setFieldErrors(err.details);
      else setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <p className="muted">Join Tastebook to post your own recipes.</p>

      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldErrors.name ? "invalid" : ""}
          />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldErrors.email ? "invalid" : ""}
          />
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldErrors.password ? "invalid" : ""}
          />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        <button type="submit" className="btn btn-block" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
