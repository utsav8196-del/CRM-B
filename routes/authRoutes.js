import express from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {User} from "../models/User.js";
import { register } from "../controllers/authController.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER
router.post("/register", register);

// LOGIN
router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    let success = false;

    // ✅ validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // ✅ check user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success, error: "Invalid credentials" });
      }

      // ✅ compare password
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({ success, error: "Invalid credentials" });
      }

      // ✅ payload
      const data = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      // ✅ generate token
      const authtoken = jwt.sign(data, JWT_SECRET, {
        expiresIn: "1d",
      });

      success = true;

      res.json({
        success,
        authtoken,
        userId: user.id,
        role: user.role,
        isAdmin: user.role === "admin",
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);

export default router;
