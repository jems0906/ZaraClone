const express = require("express");
const multer = require("multer");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const { parseUploadedFile } = require("../utils/textParser");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.post("/", auth, upload.single("resume"), async (req, res) => {
  const { title = "Resume" } = req.body;

  try {
    const parsedText = await parseUploadedFile(req.file);

    const created = await pool.query(
      "INSERT INTO resumes (user_id, title, original_filename, mime_type, parsed_text) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.id, title, req.file.originalname, req.file.mimetype, parsedText]
    );

    return res.status(201).json(created.rows[0]);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to upload resume" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT id, user_id, title, original_filename, mime_type, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    return res.json(rows.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to list resumes" });
  }
});

module.exports = router;
