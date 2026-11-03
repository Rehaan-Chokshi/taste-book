const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// Sets req.userId if a valid token is sent, but never blocks the request
function optionalAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme === "Bearer" && token) {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = payload.id;
        } catch (err) {
            // Invalid token on a public route: treat as logged out
        }
    }
    next();
}

module.exports = { requireAuth, optionalAuth };