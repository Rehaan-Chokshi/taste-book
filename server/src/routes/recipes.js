const express = require("express");
const prisma = require("../prisma");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const {
    recipeInclude,
    formatRecipe,
    getUserFlags,
    formatWithFlags,
} = require("../utils/recipeHelpers");

const router = express.Router();

const CATEGORIES = ["breakfast", "lunch", "dinner", "dessert", "snack", "vegan", "drinks"];

// Check the request body. Returns { errors, data }.
function validateRecipe(body) {
    const errors = {};

    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const category = (body.category || "").trim().toLowerCase();
    const cookingTime = Number(body.cookingTime);
    const imageUrl = (body.imageUrl || "").trim();

    const cleanList = (value) =>
        Array.isArray(value)
            ? value.map((item) => String(item).trim()).filter(Boolean)
            : [];
    const ingredients = cleanList(body.ingredients);
    const steps = cleanList(body.steps);

    if (title.length < 3 || title.length > 100) {
        errors.title = "Title must be between 3 and 100 characters";
    }
    if (description.length < 10 || description.length > 500) {
        errors.description = "Description must be between 10 and 500 characters";
    }
    if (ingredients.length < 1) errors.ingredients = "Add at least one ingredient";
    if (steps.length < 1) errors.steps = "Add at least one step";
    if (!CATEGORIES.includes(category)) {
        errors.category = `Category must be one of: ${CATEGORIES.join(", ")}`;
    }
    if (!Number.isInteger(cookingTime) || cookingTime < 1 || cookingTime > 1440) {
        errors.cookingTime = "Cooking time must be a whole number of minutes (1 to 1440)";
    }
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
        errors.imageUrl = "Image URL must start with http:// or https://";
    }

    return {
        errors,
        data: {
            title,
            description,
            category,
            cookingTime,
            imageUrl: imageUrl || null,
            ingredients: JSON.stringify(ingredients),
            steps: JSON.stringify(steps),
        },
    };
}

// Read and check the :id from the URL
function parseId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: "Invalid recipe id" });
        return null;
    }
    return id;
}

// GET /api/recipes/categories  (used by the frontend filter dropdown)
// Must stay above "/:id", otherwise "categories" is treated as an id.
router.get("/categories", (req, res) => {
    res.json({ categories: CATEGORIES });
});

// GET /api/recipes?search=&category=&maxTime=&sort=
router.get("/", optionalAuth, async (req, res, next) => {
    try {
        const search = String(req.query.search || "").trim();
        const category = String(req.query.category || "").trim().toLowerCase();
        const maxTimeRaw = String(req.query.maxTime || "").trim();
        const sort = String(req.query.sort || "newest");

        const where = {};

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { ingredients: { contains: search } },
            ];
        }

        if (category) {
            if (!CATEGORIES.includes(category)) {
                return res.status(400).json({
                    error: `Category must be one of: ${CATEGORIES.join(", ")}`,
                });
            }
            where.category = category;
        }

        if (maxTimeRaw) {
            const maxTime = Number(maxTimeRaw);
            if (!Number.isInteger(maxTime) || maxTime < 1) {
                return res.status(400).json({ error: "maxTime must be a positive whole number" });
            }
            where.cookingTime = { lte: maxTime };
        }

        const sortOptions = {
            newest: { createdAt: "desc" },
            oldest: { createdAt: "asc" },
            quickest: { cookingTime: "asc" },
            popular: { likes: { _count: "desc" } },
        };
        if (!sortOptions[sort]) {
            return res.status(400).json({
                error: `sort must be one of: ${Object.keys(sortOptions).join(", ")}`,
            });
        }

        const recipes = await prisma.recipe.findMany({
            where,
            orderBy: sortOptions[sort],
            include: recipeInclude,
        });

        const flags = await getUserFlags(req.userId, recipes.map((r) => r.id));

        res.json({
            recipes: recipes.map((r) => formatWithFlags(r, flags)),
            count: recipes.length,
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/recipes/:id
router.get("/:id", optionalAuth, async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;

        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                ...recipeInclude,
                comments: {
                    orderBy: { createdAt: "desc" },
                    include: { user: { select: { id: true, name: true } } },
                },
            },
        });

        if (!recipe) return res.status(404).json({ error: "Recipe not found" });

        const flags = await getUserFlags(req.userId, [id]);

        res.json({
            recipe: {
                ...formatRecipe(recipe),
                likedByMe: flags.liked.has(id),
                bookmarkedByMe: flags.bookmarked.has(id),
                comments: recipe.comments,
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/recipes
router.post("/", requireAuth, async (req, res, next) => {
    try {
        const { errors, data } = validateRecipe(req.body);
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const recipe = await prisma.recipe.create({
            data: { ...data, authorId: req.userId },
            include: recipeInclude,
        });
        res.status(201).json({ recipe: formatRecipe(recipe) });
    } catch (err) {
        next(err);
    }
});

// PUT /api/recipes/:id
router.put("/:id", requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;

        const existing = await prisma.recipe.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Recipe not found" });
        if (existing.authorId !== req.userId) {
            return res.status(403).json({ error: "You can only edit your own recipes" });
        }

        const { errors, data } = validateRecipe(req.body);
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const recipe = await prisma.recipe.update({
            where: { id },
            data,
            include: recipeInclude,
        });
        res.json({ recipe: formatRecipe(recipe) });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/recipes/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req, res);
        if (id === null) return;

        const existing = await prisma.recipe.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Recipe not found" });
        if (existing.authorId !== req.userId) {
            return res.status(403).json({ error: "You can only delete your own recipes" });
        }

        await prisma.recipe.delete({ where: { id } });
        res.json({ message: "Recipe deleted" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;