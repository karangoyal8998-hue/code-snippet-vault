const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors()); // Allows frontend (Vercel) to talk to backend (Render)
app.use(express.json()); // Parses incoming JSON data from requests

// 1. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.log("Database connection error:", err));

// 2. Mongoose Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

const snippetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Snippet = mongoose.model("Snippet", snippetSchema);

// 3. Authentication Middleware (Checks if user is logged in via JWT)
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. Please login first." });
  }

  // Format is "Bearer <token>", so we split by space and take the second part
  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Save logged-in user's ID into req.user
    next(); // Move to the next function
  } catch (err) {
    res.status(400).json({ message: "Invalid token" });
  }
}

// 4. Auth Routes (Register & Login)
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Encrypt password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Registration successful! Please login." });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user in database
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // Create JWT token valid for 1 day
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// 5. CRUD Routes for Code Snippets (All protected by verifyToken)

// CREATE: Save a new snippet
app.post("/api/snippets", verifyToken, async (req, res) => {
  try {
    const { title, language, code } = req.body;
    const newSnippet = new Snippet({
      userId: req.user.id,
      title,
      language,
      code
    });
    const savedSnippet = await newSnippet.save();
    res.status(201).json(savedSnippet);
  } catch (err) {
    res.status(500).json({ message: "Failed to save snippet" });
  }
});

// READ: Get all snippets belonging to the logged-in user
app.get("/api/snippets", verifyToken, async (req, res) => {
  try {
    const snippets = await Snippet.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(snippets);
  } catch (err) {
    res.status(500).json({ message: "Failed to load snippets" });
  }
});

// UPDATE: Edit an existing snippet
app.put("/api/snippets/:id", verifyToken, async (req, res) => {
  try {
    const { title, language, code } = req.body;
    const updatedSnippet = await Snippet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, language, code },
      { new: true }
    );
    res.json(updatedSnippet);
  } catch (err) {
    res.status(500).json({ message: "Failed to update snippet" });
  }
});

// DELETE: Delete a snippet
app.delete("/api/snippets/:id", verifyToken, async (req, res) => {
  try {
    await Snippet.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Snippet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete snippet" });
  }
});

// Test route to check if server is awake
app.get("/", (req, res) => {
  res.send("Code Snippet Vault API is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));