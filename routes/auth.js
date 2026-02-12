const express = require("express");
const passport = require("passport");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = new User({ name, email });
    await User.register(user, password);

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
router.post("/login",
  passport.authenticate("local"),
  (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  }
);

// LOGOUT
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

// CURRENT USER
router.get("/me", (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ message: "Not authenticated" });

  res.json(req.user);
});

module.exports = router;
