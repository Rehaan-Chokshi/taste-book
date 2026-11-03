import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function RecipeCard({ recipe, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [liked, setLiked] = useState(Boolean(recipe.likedByMe));
  const [likeCount, setLikeCount] = useState(recipe.likeCount || 0);
  const [bookmarked, setBookmarked] = useState(Boolean(recipe.bookmarkedByMe));
  const [bookmarkCount, setBookmarkCount] = useState(recipe.bookmarkCount || 0);
  const [imgError, setImgError] = useState(false);
  const [pendingLike, setPendingLike] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(false);

  // Keep state in sync if parent passes updated props
  if (recipe.likedByMe !== undefined && recipe.likedByMe !== liked && !pendingLike) {
    setLiked(recipe.likedByMe);
  }
  if (recipe.likeCount !== undefined && recipe.likeCount !== likeCount && !pendingLike) {
    setLikeCount(recipe.likeCount);
  }
  if (recipe.bookmarkedByMe !== undefined && recipe.bookmarkedByMe !== bookmarked && !pendingBookmark) {
    setBookmarked(recipe.bookmarkedByMe);
  }
  if (recipe.bookmarkCount !== undefined && recipe.bookmarkCount !== bookmarkCount && !pendingBookmark) {
    setBookmarkCount(recipe.bookmarkCount);
  }

  async function handleLike(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (pendingLike) return;

    setPendingLike(true);
    // Optimistic toggle
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const data = await api(`/recipes/${recipe.id}/like`, { method: "POST" });
      setLiked(data.liked);
      setLikeCount(data.likeCount);
      if (onUpdate) {
        onUpdate({ ...recipe, likedByMe: data.liked, likeCount: data.likeCount });
      }
    } catch {
      // Revert on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setPendingLike(false);
    }
  }

  async function handleBookmark(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (pendingBookmark) return;

    setPendingBookmark(true);
    // Optimistic toggle
    const prevBookmarked = bookmarked;
    const prevCount = bookmarkCount;
    setBookmarked(!prevBookmarked);
    setBookmarkCount(prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const data = await api(`/recipes/${recipe.id}/bookmark`, { method: "POST" });
      setBookmarked(data.bookmarked);
      setBookmarkCount(data.bookmarkCount);
      if (onUpdate) {
        onUpdate({ ...recipe, bookmarkedByMe: data.bookmarked, bookmarkCount: data.bookmarkCount });
      }
    } catch {
      // Revert on error
      setBookmarked(prevBookmarked);
      setBookmarkCount(prevCount);
    } finally {
      setPendingBookmark(false);
    }
  }

  const categoryLabel = recipe.category
    ? recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)
    : "";

  return (
    <article className="recipe-card">
      <Link to={`/recipes/${recipe.id}`} className="card-media-link" tabIndex={-1}>
        <div className="card-media">
          {recipe.imageUrl && !imgError ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="card-media-placeholder">
              <span className="placeholder-icon">🍳</span>
            </div>
          )}
          <span className="category-pill">{categoryLabel}</span>
        </div>
      </Link>

      <div className="card-body">
        <div className="card-meta-top">
          <span className="time-badge">⏱️ {recipe.cookingTime} min</span>
        </div>

        <h3 className="card-title">
          <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
        </h3>

        <p className="card-desc">{recipe.description}</p>

        <div className="card-footer">
          <div className="card-author">
            {recipe.author ? (
              <>
                <span className="author-prefix">by</span>{" "}
                <Link to={`/users/${recipe.author.id}`} className="author-link">
                  {recipe.author.name}
                </Link>
              </>
            ) : null}
          </div>

          <div className="card-actions">
            <button
              type="button"
              className={`action-btn like-btn ${liked ? "active" : ""}`}
              onClick={handleLike}
              title={liked ? "Unlike" : "Like"}
              aria-label={liked ? "Unlike recipe" : "Like recipe"}
            >
              <svg viewBox="0 0 24 24" className="icon" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{likeCount}</span>
            </button>

            <button
              type="button"
              className={`action-btn bookmark-btn ${bookmarked ? "active" : ""}`}
              onClick={handleBookmark}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
            >
              <svg viewBox="0 0 24 24" className="icon" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>{bookmarkCount}</span>
            </button>

            <Link
              to={`/recipes/${recipe.id}#comments`}
              className="action-link comments-stat"
              title="Comments"
              aria-label="View comments"
            >
              <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{recipe.commentCount || 0}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
