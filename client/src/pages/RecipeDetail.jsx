import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function RecipeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interactions state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  // Checked ingredients (local state for cooking checklist)
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);

  const loadRecipe = useCallback(() => {
    setLoading(true);
    setError("");

    api(`/recipes/${id}`)
      .then((data) => {
        const r = data.recipe;
        setRecipe(r);
        setLiked(Boolean(r.likedByMe));
        setLikeCount(r.likeCount || 0);
        setBookmarked(Boolean(r.bookmarkedByMe));
        setBookmarkCount(r.bookmarkCount || 0);
        setComments(r.comments || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load recipe");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  async function handleToggleLike() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (likePending) return;

    setLikePending(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const data = await api(`/recipes/${id}/like`, { method: "POST" });
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikePending(false);
    }
  }

  async function handleToggleBookmark() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (bookmarkPending) return;

    setBookmarkPending(true);
    const prevBookmarked = bookmarked;
    const prevCount = bookmarkCount;
    setBookmarked(!prevBookmarked);
    setBookmarkCount(prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const data = await api(`/recipes/${id}/bookmark`, { method: "POST" });
      setBookmarked(data.bookmarked);
      setBookmarkCount(data.bookmarkCount);
    } catch {
      setBookmarked(prevBookmarked);
      setBookmarkCount(prevCount);
    } finally {
      setBookmarkPending(false);
    }
  }

  async function handleDeleteRecipe() {
    if (!window.confirm("Are you sure you want to delete this recipe? This cannot be undone.")) {
      return;
    }
    setDeletingRecipe(true);
    try {
      await api(`/recipes/${id}`, { method: "DELETE" });
      navigate("/", { replace: true });
    } catch (err) {
      alert(err.message || "Could not delete recipe");
      setDeletingRecipe(false);
    }
  }

  function toggleIngredient(idx) {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    setCommentError("");
    const text = newComment.trim();

    if (!text) {
      setCommentError("Comment cannot be empty");
      return;
    }
    if (text.length > 500) {
      setCommentError("Comment must be 500 characters or fewer");
      return;
    }

    setSubmittingComment(true);
    try {
      const data = await api(`/recipes/${id}/comments`, {
        method: "POST",
        body: { text },
      });
      setComments((prev) => [data.comment, ...prev]);
      setNewComment("");
    } catch (err) {
      if (err.details?.text) {
        setCommentError(err.details.text);
      } else {
        setCommentError(err.message || "Failed to post comment");
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;

    try {
      await api(`/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.message || "Could not delete comment");
    }
  }

  if (loading) return <Spinner label="Loading recipe..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadRecipe} />;
  if (!recipe) return null;

  const isAuthor = user && recipe.author && user.id === recipe.author.id;
  const formattedDate = new Date(recipe.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="recipe-detail-page">
      <div className="detail-top-nav">
        <Link to="/" className="back-link">
          ← Back to recipes
        </Link>
      </div>

      <header className="detail-header">
        <div className="detail-badges">
          <span className="category-pill">{recipe.category}</span>
          <span className="time-badge">⏱️ {recipe.cookingTime} min</span>
        </div>

        <h1 className="detail-title">{recipe.title}</h1>

        <div className="detail-meta">
          <div className="detail-author-info">
            <span>Posted by</span>{" "}
            <Link to={`/users/${recipe.author.id}`} className="author-link">
              <strong>{recipe.author.name}</strong>
            </Link>
            <span className="bullet-sep">·</span>
            <time className="muted">{formattedDate}</time>
          </div>

          {isAuthor && (
            <div className="owner-actions">
              <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline btn-small">
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={handleDeleteRecipe}
                disabled={deletingRecipe}
              >
                {deletingRecipe ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Image */}
      {recipe.imageUrl && (
        <div className="detail-hero-media">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Description */}
      <p className="detail-description">{recipe.description}</p>

      {/* Action / Interaction Bar */}
      <div className="detail-interactions-bar">
        <button
          type="button"
          className={`action-btn-large like-btn ${liked ? "active" : ""}`}
          onClick={handleToggleLike}
          aria-label={liked ? "Unlike recipe" : "Like recipe"}
        >
          <svg viewBox="0 0 24 24" className="icon" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
        </button>

        <button
          type="button"
          className={`action-btn-large bookmark-btn ${bookmarked ? "active" : ""}`}
          onClick={handleToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
        >
          <svg viewBox="0 0 24 24" className="icon" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>{bookmarked ? "Saved" : "Save"}</span>
        </button>
      </div>

      {/* Content Grid: Ingredients & Steps */}
      <div className="recipe-content-grid">
        {/* Ingredients Column */}
        <section className="recipe-ingredients-box">
          <h2>Ingredients</h2>
          <p className="box-tip muted">Tap ingredients as you prepare them</p>
          <ul className="ingredients-checklist">
            {recipe.ingredients.map((item, idx) => {
              const isChecked = Boolean(checkedIngredients[idx]);
              return (
                <li
                  key={idx}
                  className={`ingredient-item ${isChecked ? "checked" : ""}`}
                  onClick={() => toggleIngredient(idx)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleIngredient(idx)}
                    aria-label={item}
                  />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Steps Column */}
        <section className="recipe-steps-box">
          <h2>Instructions</h2>
          <ol className="steps-list">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="step-item">
                <div className="step-number">{idx + 1}</div>
                <div className="step-text">{step}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Comments Section */}
      <section className="recipe-comments-section" id="comments">
        <div className="comments-header">
          <h2>Comments ({comments.length})</h2>
        </div>

        {/* Add Comment Form or Login Notice */}
        {user ? (
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <div className="field">
              <label htmlFor="comment-input" className="sr-only">
                Leave a comment
              </label>
              <textarea
                id="comment-input"
                rows={3}
                placeholder="Share your thoughts, tweaks or questions about this recipe..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={500}
                className={commentError ? "invalid" : ""}
              />
              <div className="comment-form-footer">
                <span className="char-count muted">{newComment.length}/500</span>
                <button
                  type="submit"
                  className="btn btn-small"
                  disabled={submittingComment || !newComment.trim()}
                >
                  {submittingComment ? "Posting..." : "Post comment"}
                </button>
              </div>
              {commentError && <p className="field-error">{commentError}</p>}
            </div>
          </form>
        ) : (
          <div className="comment-login-prompt">
            <p>
              <Link to="/login" state={{ from: location.pathname }}>
                Log in
              </Link>{" "}
              or{" "}
              <Link to="/signup" state={{ from: location.pathname }}>
                sign up
              </Link>{" "}
              to join the discussion and share your feedback.
            </p>
          </div>
        )}

        {/* Comments Feed */}
        <div className="comments-list">
          {comments.length === 0 ? (
            <p className="muted no-comments">No comments yet. Start the conversation!</p>
          ) : (
            comments.map((c) => {
              const isCommentAuthor = user && c.user && user.id === c.user.id;
              const commentDate = new Date(c.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <article key={c.id} className="comment-card">
                  <div className="comment-meta">
                    <Link to={`/users/${c.user.id}`} className="comment-user">
                      {c.user.name}
                    </Link>
                    <span className="comment-date muted">{commentDate}</span>
                    {isCommentAuthor && (
                      <button
                        type="button"
                        className="btn-link-danger comment-delete-btn"
                        onClick={() => handleDeleteComment(c.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="comment-text">{c.text}</p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
