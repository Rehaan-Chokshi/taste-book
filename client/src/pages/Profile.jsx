import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import RecipeCard from "../components/RecipeCard.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function Profile() {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("recipes"); // "recipes" | "saved" | "liked"

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError("");

    api(`/users/${id}`)
      .then((data) => {
        setProfileData(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load user profile");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleRecipeUpdate(updated) {
    if (!profileData) return;
    const updateList = (list) =>
      list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));

    setProfileData((prev) => ({
      ...prev,
      recipes: updateList(prev.recipes),
      bookmarkedRecipes: updateList(prev.bookmarkedRecipes || []),
      likedRecipes: updateList(prev.likedRecipes || []),
    }));
  }

  if (loading) return <Spinner label="Loading profile..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadProfile} />;
  if (!profileData) return null;

  const { user, isOwnProfile, stats, recipes, bookmarkedRecipes, likedRecipes } =
    profileData;

  const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  let displayedRecipes = recipes;
  if (activeTab === "saved") displayedRecipes = bookmarkedRecipes || [];
  if (activeTab === "liked") displayedRecipes = likedRecipes || [];

  return (
    <div className="profile-page">
      {/* Header */}
      <section className="profile-header-card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{initials}</div>
        </div>

        <div className="profile-user-info">
          <div className="profile-name-row">
            <h1>{user.name}</h1>
            {isOwnProfile && <span className="own-profile-badge">You</span>}
          </div>

          {user.email && <p className="profile-email muted">{user.email}</p>}

          <p className="profile-joined muted">Member since {joinedDate}</p>
        </div>

        {/* Stats Row */}
        <div className="profile-stats">
          <div className="stat-card">
            <span className="stat-value">{stats?.recipeCount ?? 0}</span>
            <span className="stat-label">Recipes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats?.likesReceived ?? 0}</span>
            <span className="stat-label">Likes received</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats?.commentsWritten ?? 0}</span>
            <span className="stat-label">Comments</span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="profile-content-section">
        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${activeTab === "recipes" ? "active" : ""}`}
            onClick={() => setActiveTab("recipes")}
          >
            Recipes ({recipes.length})
          </button>

          {isOwnProfile && (
            <>
              <button
                type="button"
                className={`profile-tab ${activeTab === "saved" ? "active" : ""}`}
                onClick={() => setActiveTab("saved")}
              >
                Saved ({bookmarkedRecipes ? bookmarkedRecipes.length : 0})
              </button>

              <button
                type="button"
                className={`profile-tab ${activeTab === "liked" ? "active" : ""}`}
                onClick={() => setActiveTab("liked")}
              >
                Liked ({likedRecipes ? likedRecipes.length : 0})
              </button>
            </>
          )}
        </div>

        {/* Tab Content Grid / Empty state */}
        <div className="tab-pane">
          {displayedRecipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {activeTab === "recipes"
                  ? "🍲"
                  : activeTab === "saved"
                  ? "🔖"
                  : "❤️"}
              </div>
              <h2>
                {activeTab === "recipes"
                  ? isOwnProfile
                    ? "You haven't posted any recipes yet"
                    : `${user.name} hasn't posted any recipes yet`
                  : activeTab === "saved"
                  ? "No saved recipes yet"
                  : "No liked recipes yet"}
              </h2>
              <p className="muted">
                {activeTab === "recipes"
                  ? isOwnProfile
                    ? "Share your favorite culinary creations with everyone!"
                    : "Check back later when they share a recipe."
                  : activeTab === "saved"
                  ? "When you find recipes you want to make, tap the bookmark icon to save them here."
                  : "Recipes you like will appear here for easy access."}
              </p>
              {isOwnProfile && activeTab === "recipes" && (
                <Link to="/recipes/new" className="btn">
                  + Create your first recipe
                </Link>
              )}
            </div>
          ) : (
            <div className="recipe-grid">
              {displayedRecipes.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onUpdate={handleRecipeUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
