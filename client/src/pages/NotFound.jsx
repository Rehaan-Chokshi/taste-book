import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="center-block">
      <h1>Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn">
        Back to home
      </Link>
    </div>
  );
}
