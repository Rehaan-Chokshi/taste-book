import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "snack",
  "vegan",
  "drinks",
];

export default function RecipeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loadingRecipe, setLoadingRecipe] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("dinner");
  const [cookingTime, setCookingTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState([""]);
  const [steps, setSteps] = useState([""]);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load existing recipe when in edit mode
  useEffect(() => {
    if (!isEdit) return;

    setLoadingRecipe(true);
    setLoadError("");

    api(`/recipes/${id}`)
      .then((data) => {
        const r = data.recipe;
        if (user && r.author && r.author.id !== user.id) {
          setLoadError("You can only edit your own recipes.");
          return;
        }
        setTitle(r.title || "");
        setDescription(r.description || "");
        setCategory(r.category || "dinner");
        setCookingTime(String(r.cookingTime || ""));
        setImageUrl(r.imageUrl || "");
        setIngredients(
          Array.isArray(r.ingredients) && r.ingredients.length > 0
            ? r.ingredients
            : [""]
        );
        setSteps(
          Array.isArray(r.steps) && r.steps.length > 0 ? r.steps : [""]
        );
      })
      .catch((err) => {
        setLoadError(err.message || "Failed to load recipe for editing");
      })
      .finally(() => setLoadingRecipe(false));
  }, [id, isEdit, user]);

  // Ingredients helpers
  function handleIngredientChange(index, value) {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, ""]);
  }

  function removeIngredient(index) {
    setIngredients((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  // Steps helpers
  function handleStepChange(index, value) {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(index) {
    setSteps((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errors = {};
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    const timeNum = Number(cookingTime);
    const trimmedImg = imageUrl.trim();

    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      errors.title = "Title must be between 3 and 100 characters";
    }
    if (trimmedDesc.length < 10 || trimmedDesc.length > 500) {
      errors.description = "Description must be between 10 and 500 characters";
    }
    if (!CATEGORIES.includes(category)) {
      errors.category = `Select a valid category`;
    }
    if (!cookingTime || !Number.isInteger(timeNum) || timeNum < 1 || timeNum > 1440) {
      errors.cookingTime = "Cooking time must be a whole number of minutes (1 to 1440)";
    }
    if (cleanIngredients.length < 1) {
      errors.ingredients = "Add at least one ingredient";
    }
    if (cleanSteps.length < 1) {
      errors.steps = "Add at least one step";
    }
    if (trimmedImg && !/^https?:\/\/\S+$/i.test(trimmedImg)) {
      errors.imageUrl = "Image URL must start with http:// or https://";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    const payload = {
      title: trimmedTitle,
      description: trimmedDesc,
      category,
      cookingTime: timeNum,
      imageUrl: trimmedImg || null,
      ingredients: cleanIngredients,
      steps: cleanSteps,
    };

    try {
      if (isEdit) {
        const data = await api(`/recipes/${id}`, {
          method: "PUT",
          body: payload,
        });
        navigate(`/recipes/${data.recipe.id}`, { replace: true });
      } else {
        const data = await api("/recipes", {
          method: "POST",
          body: payload,
        });
        navigate(`/recipes/${data.recipe.id}`, { replace: true });
      }
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      } else {
        setServerError(err.message || "Failed to save recipe");
      }
      setSubmitting(false);
    }
  }

  if (loadingRecipe) return <Spinner label="Loading recipe..." />;
  if (loadError) return <ErrorMessage message={loadError} />;

  return (
    <div className="recipe-form-card">
      <div className="form-header">
        <h1>{isEdit ? "Edit recipe" : "Share a new recipe"}</h1>
        <p className="muted">
          {isEdit
            ? "Update your recipe details, ingredients or cooking instructions."
            : "Fill in the details below to share your culinary creation with the Tastebook community."}
        </p>
      </div>

      <ErrorMessage message={serverError} />

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="field">
          <label htmlFor="title">Recipe Title *</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Creamy Tuscan Garlic Chicken"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldErrors.title ? "invalid" : ""}
            maxLength={100}
          />
          {fieldErrors.title && <p className="field-error">{fieldErrors.title}</p>}
        </div>

        {/* Description */}
        <div className="field">
          <label htmlFor="description">Short Description *</label>
          <textarea
            id="description"
            rows={3}
            placeholder="Tell us what makes this dish special, flavour profile, or serving suggestions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldErrors.description ? "invalid" : ""}
            maxLength={500}
          />
          <div className="field-hint-row">
            {fieldErrors.description ? (
              <p className="field-error">{fieldErrors.description}</p>
            ) : (
              <span />
            )}
            <span className="char-count muted">{description.length}/500</span>
          </div>
        </div>

        {/* Category and Cooking Time Row */}
        <div className="form-row-2">
          <div className="field">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldErrors.category ? "invalid" : ""}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            {fieldErrors.category && <p className="field-error">{fieldErrors.category}</p>}
          </div>

          <div className="field">
            <label htmlFor="cookingTime">Cooking Time (minutes) *</label>
            <input
              id="cookingTime"
              type="number"
              min="1"
              max="1440"
              placeholder="e.g. 30"
              value={cookingTime}
              onChange={(e) => setCookingTime(e.target.value)}
              className={fieldErrors.cookingTime ? "invalid" : ""}
            />
            {fieldErrors.cookingTime && (
              <p className="field-error">{fieldErrors.cookingTime}</p>
            )}
          </div>
        </div>

        {/* Image URL */}
        <div className="field">
          <label htmlFor="imageUrl">Photo URL (optional)</label>
          <input
            id="imageUrl"
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={fieldErrors.imageUrl ? "invalid" : ""}
          />
          {fieldErrors.imageUrl ? (
            <p className="field-error">{fieldErrors.imageUrl}</p>
          ) : (
            <p className="field-hint muted">Paste a direct image link (JPEG, PNG, WebP).</p>
          )}
        </div>

        {/* Ingredients Dynamic List */}
        <div className="field-section">
          <div className="field-section-header">
            <label>Ingredients *</label>
            <span className="muted field-section-hint">List each ingredient with quantity</span>
          </div>

          {fieldErrors.ingredients && (
            <p className="field-error">{fieldErrors.ingredients}</p>
          )}

          <div className="dynamic-list">
            {ingredients.map((item, index) => (
              <div key={index} className="dynamic-list-row">
                <input
                  type="text"
                  placeholder={`Ingredient ${index + 1} (e.g. 2 cloves garlic, minced)`}
                  value={item}
                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1 && !item}
                  title="Remove ingredient"
                  aria-label="Remove ingredient"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-small btn-add-row"
            onClick={addIngredient}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Steps Dynamic List */}
        <div className="field-section">
          <div className="field-section-header">
            <label>Instructions *</label>
            <span className="muted field-section-hint">Step-by-step preparation</span>
          </div>

          {fieldErrors.steps && <p className="field-error">{fieldErrors.steps}</p>}

          <div className="dynamic-list">
            {steps.map((item, index) => (
              <div key={index} className="dynamic-list-row dynamic-step-row">
                <span className="step-badge">{index + 1}</span>
                <textarea
                  rows={2}
                  placeholder={`Step ${index + 1} instructions...`}
                  value={item}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1 && !item}
                  title="Remove step"
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-small btn-add-row"
            onClick={addStep}
          >
            + Add Step
          </button>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-submit"
            disabled={submitting}
          >
            {submitting
              ? isEdit
                ? "Saving..."
                : "Publishing..."
              : isEdit
              ? "Save changes"
              : "Publish recipe"}
          </button>
          <Link
            to={isEdit ? `/recipes/${id}` : "/"}
            className="btn btn-outline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
