import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import RecipeCard from "../components/RecipeCard.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const DEFAULT_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "snack",
  "vegan",
  "drinks",
];

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params (so filters are shareable / survive refreshes)
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const maxTime = searchParams.get("maxTime") || "";
  const sort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(search);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync search input if URL search param changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Load category list from backend
  useEffect(() => {
    api("/recipes/categories")
      .then((data) => {
        if (Array.isArray(data?.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_CATEGORIES
      });
  }, []);

  const loadRecipes = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (maxTime) params.set("maxTime", maxTime);
    if (sort && sort !== "newest") params.set("sort", sort);

    const query = params.toString();
    const endpoint = query ? `/recipes?${query}` : "/recipes";

    api(endpoint)
      .then((data) => setRecipes(data.recipes || []))
      .catch((err) => setError(err.message || "Failed to load recipes"))
      .finally(() => setLoading(false));
  }, [search, category, maxTime, sort]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateParam("search", searchInput.trim());
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  }

  function handleRecipeUpdate(updated) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
  }

  const hasActiveFilters = Boolean(search || category || maxTime || sort !== "newest");

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero">
        <div className="hero-content">
          <h1>Discover & share delicious recipes</h1>
          <p className="hero-subtitle">
            Explore homemade favorites, quick weeknight dinners, and mouth-watering desserts shared by passionate home cooks.
          </p>
          <div className="hero-cta-wrap">
            <Link to={user ? "/recipes/new" : "/signup"} className="btn">
              + Share a Recipe
            </Link>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="toolbar-section">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrap">
            <svg viewBox="0 0 24 24" className="search-icon" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search recipes, ingredients, keywords..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setSearchInput("");
                  updateParam("search", "");
                }}
                aria-label="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-search">
            Search
          </button>
        </form>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="category-select" className="filter-label">
              Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => updateParam("category", e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="maxtime-select" className="filter-label">
              Max Time
            </label>
            <select
              id="maxtime-select"
              value={maxTime}
              onChange={(e) => updateParam("maxTime", e.target.value)}
              className="filter-select"
            >
              <option value="">Any duration</option>
              <option value="15">15 min or less</option>
              <option value="30">30 min or less</option>
              <option value="45">45 min or less</option>
              <option value="60">60 min or less</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-select" className="filter-label">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="quickest">Quickest</option>
              <option value="popular">Most popular</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline btn-small btn-clear-filters"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Feed Status and Grid */}
      <section className="feed-section">
        {loading && <Spinner label="Loading recipes..." />}

        <ErrorMessage message={error} onRetry={loadRecipes} />

        {!loading && !error && recipes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🍲</div>
            <h2>No recipes found</h2>
            <p className="muted">
              {hasActiveFilters
                ? "We couldn't find any recipes matching your current filters or search query."
                : "No recipes have been posted yet. Be the first to share one!"}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            ) : (
              <Link to={user ? "/recipes/new" : "/login"} className="btn">
                Create a recipe
              </Link>
            )}
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <>
            <div className="feed-header">
              <span className="recipe-count-badge">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} found
              </span>
            </div>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onUpdate={handleRecipeUpdate}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
