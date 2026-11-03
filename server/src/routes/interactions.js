const express = require("express");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id >= 1 ? id : null;
}

// Builds a toggle handler for Like or Bookmark (they work identically)
function toggleRoute(model, flagName, countName) {
    return async (req, res, next) => {
        try {
            const recipeId = parseId(req.params.id);
            if (recipeId === null) {
                return res.status(400).json({ error: "Invalid recipe id" });
            }

            const recipe = await prisma.recipe.findUnique({
                where: { id: recipeId },
                select: { id: true },
            });
            if (!recipe) return res.status(404).json({ error: "Recipe not found" });

            const key = { userId_recipeId: { userId: req.userId, recipeId } };
            const existing = await prisma[model].findUnique({ where: key });

            if (existing) {
                await prisma[model].delete({ where: key });
            } else {
                await prisma[model].create({ data: { userId: req.userId, recipeId } });
            }

            const count = await prisma[model].count({ where: { recipeId } });
            res.json({ [flagName]: !existing, [countName]: count });
        } catch (err) {
            next(err);
        }
    };
}

// POST /api/recipes/:id/like
router.post("/recipes/:id/like", requireAuth, toggleRoute("like", "liked", "likeCount"));

// POST /api/recipes/:id/bookmark
router.post(
    "/recipes/:id/bookmark",
    requireAuth,
    toggleRoute("bookmark", "bookmarked", "bookmarkCount")
);

// POST /api/recipes/:id/comments
router.post("/recipes/:id/comments", requireAuth, async (req, res, next) => {
    try {
        const recipeId = parseId(req.params.id);
        if (recipeId === null) {
            return res.status(400).json({ error: "Invalid recipe id" });
        }

        const text = (req.body.text || "").trim();
        if (text.length < 1 || text.length > 500) {
            return res.status(400).json({
                error: "Validation failed",
                details: { text: "Comment must be between 1 and 500 characters" },
            });
        }

        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true },
        });
        if (!recipe) return res.status(404).json({ error: "Recipe not found" });

        const comment = await prisma.comment.create({
            data: { text, recipeId, userId: req.userId },
            include: { user: { select: { id: true, name: true } } },
        });
        res.status(201).json({ comment });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/comments/:id
router.delete("/comments/:id", requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return res.status(400).json({ error: "Invalid comment id" });

        const comment = await prisma.comment.findUnique({ where: { id } });
        if (!comment) return res.status(404).json({ error: "Comment not found" });
        if (comment.userId !== req.userId) {
            return res.status(403).json({ error: "You can only delete your own comments" });
        }

        await prisma.comment.delete({ where: { id } });
        res.json({ message: "Comment deleted" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
