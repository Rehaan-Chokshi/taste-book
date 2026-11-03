const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
}

// POST /api/auth/signup
router.post("/signup", async (req, res, next) => {
    try {
        const name = (req.body.name || "").trim();
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";

        const errors = {};
        if (name.length < 2) errors.name = "Name must be at least 2 characters";
        if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address";
        if (password.length < 6) errors.password = "Password must be at least 6 characters";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({
                error: "Validation failed",
                details: { email: "An account with this email already exists" },
            });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashed },
        });

        res.status(201).json({ token: createToken(user.id), user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = user && (await bcrypt.compare(password, user.password));

        if (!valid) {
            // Same message for both cases so attackers can't tell which emails exist
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ token: createToken(user.id), user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(401).json({ error: "User no longer exists" });
        }
        res.json({ user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

module.exports = router;