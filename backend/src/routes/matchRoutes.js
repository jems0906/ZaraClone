const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const { scoreMatch } = require("../services/matchingService");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { resumeId, jobId } = req.body;

  if (!resumeId || !jobId) {
    return res.status(400).json({ error: "resumeId and jobId are required" });
  }

  try {
    const resumeResult = await pool.query(
      "SELECT * FROM resumes WHERE id = $1 AND user_id = $2",
      [resumeId, req.user.id]
    );
    const jobResult = await pool.query(
      "SELECT * FROM jobs WHERE id = $1 AND user_id = $2",
      [jobId, req.user.id]
    );

    if (!resumeResult.rowCount || !jobResult.rowCount) {
      return res.status(404).json({ error: "Resume or job not found" });
    }

    const resume = resumeResult.rows[0];
    const job = jobResult.rows[0];

    const analysis = scoreMatch(resume.parsed_text, job.description_text);

    const created = await pool.query(
      `INSERT INTO matches (
        user_id,
        resume_id,
        job_id,
        score,
        missing_skills,
        keyword_gaps,
        strengths_summary,
        matched_phrases
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.user.id,
        resume.id,
        job.id,
        analysis.score,
        JSON.stringify(analysis.missingSkills),
        JSON.stringify(analysis.keywordGaps),
        analysis.strengthsSummary,
        JSON.stringify(analysis.matchedPhrases),
      ]
    );

    return res.status(201).json(created.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate match" });
  }
});

router.get("/history/all", auth, async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT
        m.id,
        m.score,
        m.created_at,
        r.title AS resume_title,
        j.title AS job_title,
        j.company
      FROM matches m
      JOIN resumes r ON r.id = m.resume_id
      JOIN jobs j ON j.id = m.job_id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/dashboard/recent", auth, async (req, res) => {
  try {
    const recent = await pool.query(
      `SELECT
        m.id,
        m.score,
        m.created_at,
        j.title AS job_title
      FROM matches m
      JOIN jobs j ON j.id = m.job_id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC
      LIMIT 8`,
      [req.user.id]
    );

    const average = await pool.query(
      "SELECT COALESCE(ROUND(AVG(score)), 0) AS average_score FROM matches WHERE user_id = $1",
      [req.user.id]
    );

    return res.json({
      recent: recent.rows,
      averageScore: Number(average.rows[0].average_score || 0),
      totalMatches: recent.rowCount,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

router.get("/history", auth, async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT
        m.id,
        m.score,
        m.created_at,
        r.title AS resume_title,
        j.title AS job_title,
        j.company
      FROM matches m
      JOIN resumes r ON r.id = m.resume_id
      JOIN jobs j ON j.id = m.job_id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const details = await pool.query(
      `SELECT
        m.*,
        r.title AS resume_title,
        r.original_filename,
        r.parsed_text,
        j.title AS job_title,
        j.company,
        j.description_text
      FROM matches m
      JOIN resumes r ON r.id = m.resume_id
      JOIN jobs j ON j.id = m.job_id
      WHERE m.id = $1 AND m.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!details.rowCount) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json(details.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch match" });
  }
});

router.get("/admin/logs", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  try {
    const rows = await pool.query(
      `SELECT
        m.id,
        m.score,
        m.created_at,
        u.email,
        r.title AS resume_title,
        j.title AS job_title
      FROM matches m
      JOIN users u ON u.id = m.user_id
      JOIN resumes r ON r.id = m.resume_id
      JOIN jobs j ON j.id = m.job_id
      ORDER BY m.created_at DESC
      LIMIT 100`
    );

    return res.json(rows.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch match logs" });
  }
});

router.post("/:id/feedback", auth, async (req, res) => {
  const { rating, comments } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }

  try {
    const matchResult = await pool.query(
      "SELECT id FROM matches WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!matchResult.rowCount) {
      return res.status(404).json({ error: "Match not found" });
    }

    const created = await pool.query(
      "INSERT INTO match_feedback (match_id, user_id, rating, comments) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.params.id, req.user.id, rating, comments || null]
    );

    return res.status(201).json(created.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

module.exports = router;
