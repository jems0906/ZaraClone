const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const { scoreMatch } = require("../services/matchingService");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { title, company, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "title and description are required" });
  }

  try {
    const created = await pool.query(
      "INSERT INTO jobs (user_id, title, company, description_text) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, title, company || null, description]
    );

    return res.status(201).json(created.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create job" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    return res.json(rows.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.get("/recommendations/:resumeId", auth, async (req, res) => {
  const { resumeId } = req.params;

  try {
    const resumeResult = await pool.query(
      "SELECT parsed_text FROM resumes WHERE id = $1 AND user_id = $2",
      [resumeId, req.user.id]
    );

    if (!resumeResult.rowCount) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resumeText = resumeResult.rows[0].parsed_text;
    const jobsResult = await pool.query(
      "SELECT id, title, company, description_text FROM jobs WHERE user_id = $1",
      [req.user.id]
    );

    const recommendations = jobsResult.rows
      .map((job) => {
        const score = scoreMatch(resumeText, job.description_text).score;
        return {
          jobId: job.id,
          title: job.title,
          company: job.company,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return res.json(recommendations);
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;
