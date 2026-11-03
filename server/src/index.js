require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const recipeRoutes = require("./routes/recipes");
const interactionRoutes = require("./routes/interactions");
const userRoutes = require("./routes/users");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api", interactionRoutes);
app.use("/api/users", userRoutes);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Catch-all error handler (any error passed to next(err) lands here)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));