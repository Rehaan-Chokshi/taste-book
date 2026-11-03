const express = require("express");
const prisma = require("../prisma");
const { optionalAuth } = require("../middleware/auth");
const { recipeInclude, getUserFlags, formatWithFlags } = require("../utils/recipeHelpers");

const router = express.Router();

// GET /api/users/:id
// Public: name, join date, stats, and the recipes they posted.
// Private (only when you view your own profile): email, bookmarked and liked recipes.
router.get("/:id", optionalAuth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isOwnProfile = req.userId === id;

        const [recipes, likesReceived, commentsWritten] = await Promise.all([
            prisma.recipe.findMany({
                where: { authorId: id },
                orderBy: { createdAt: "desc" },
                include: recipeInclude,
            }),
            prisma.like.count({ where: { recipe: { authorId: id } } }),
            prisma.comment.count({ where: { userId: id } }),
        ]);

        let bookmarkedRecipes = [];
        let likedRecipes = [];

        if (isOwnProfile) {
            const [bookmarks, likes] = await Promise.all([
                prisma.bookmark.findMany({
                    where: { userId: id },
                    orderBy: { id: "desc" },
                    include: { recipe: { include: recipeInclude } },
                }),
                prisma.like.findMany({
                    where: { userId: id },
                    orderBy: { id: "desc" },
                    include: { recipe: { include: recipeInclude } },
                }),
            ]);
            bookmarkedRecipes = bookmarks.map((b) => b.recipe);
            likedRecipes = likes.map((l) => l.recipe);
        }

        // One lookup for every recipe shown, so the hearts and bookmarks render correctly
        const allIds = [
            ...new Set([...recipes, ...bookmarkedRecipes, ...likedRecipes].map((r) => r.id)),
        ];
        const flags = await getUserFlags(req.userId, allIds);

        res.json({
            user: {
                id: user.id,
                name: user.name,
                createdAt: user.createdAt,
                ...(isOwnProfile && { email: user.email }),
            },
            isOwnProfile,
            stats: {
                recipeCount: recipes.length,
                likesReceived,
                commentsWritten,
            },
            recipes: recipes.map((r) => formatWithFlags(r, flags)),
            bookmarkedRecipes: bookmarkedRecipes.map((r) => formatWithFlags(r, flags)),
            likedRecipes: likedRecipes.map((r) => formatWithFlags(r, flags)),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;