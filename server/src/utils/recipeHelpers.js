const prisma = require("../prisma");

// Reused in every recipe query so the response shape is always the same
const recipeInclude = {
    author: { select: { id: true, name: true } },
    _count: { select: { likes: true, bookmarks: true, comments: true } },
};

// Turn a database row into what the frontend receives
function formatRecipe(r) {
    return {
        id: r.id,
        title: r.title,
        description: r.description,
        ingredients: JSON.parse(r.ingredients),
        steps: JSON.parse(r.steps),
        category: r.category,
        cookingTime: r.cookingTime,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        author: r.author,
        likeCount: r._count.likes,
        bookmarkCount: r._count.bookmarks,
        commentCount: r._count.comments,
    };
}

// Which of these recipes has the current user liked / bookmarked?
async function getUserFlags(userId, recipeIds) {
    if (!userId || recipeIds.length === 0) {
        return { liked: new Set(), bookmarked: new Set() };
    }
    const [likes, bookmarks] = await Promise.all([
        prisma.like.findMany({
            where: { userId, recipeId: { in: recipeIds } },
            select: { recipeId: true },
        }),
        prisma.bookmark.findMany({
            where: { userId, recipeId: { in: recipeIds } },
            select: { recipeId: true },
        }),
    ]);
    return {
        liked: new Set(likes.map((l) => l.recipeId)),
        bookmarked: new Set(bookmarks.map((b) => b.recipeId)),
    };
}

// Format a recipe and attach likedByMe / bookmarkedByMe
function formatWithFlags(recipe, flags) {
    return {
        ...formatRecipe(recipe),
        likedByMe: flags.liked.has(recipe.id),
        bookmarkedByMe: flags.bookmarked.has(recipe.id),
    };
}

module.exports = { recipeInclude, formatRecipe, getUserFlags, formatWithFlags };