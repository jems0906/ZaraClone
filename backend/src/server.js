const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), override: true });

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const matchRoutes = require("./routes/matchRoutes");

const app = express();
const frontendDir = path.resolve(__dirname, "../../frontend_clean");

async function seedDemoUser() {
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [
      "Demo Recruiter",
      "demo@talentmatch.local",
      "$2b$10$HYuslPTi391gwUAg3XNmn.RwkZsJmU.rh4B3duRX8APEhvnbOaSF6",
      "candidate",
    ]
  );
}

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json({ limit: "4mb" }));

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Database unavailable" });
  }
});

app.use("/auth", authRoutes);
app.use("/resumes", resumeRoutes);
app.use("/jobs", jobRoutes);
app.use("/matches", matchRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    if (["/auth", "/resumes", "/jobs", "/matches", "/health"].some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    return res.sendFile(path.join(frontendDir, "index.html"));
  });
}

app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  return res.status(500).json({ error: err.message || "Internal server error" });
});

const port = Number(process.env.PORT || 4000);

seedDemoUser()
  .catch((error) => {
    console.error("Failed to seed demo user", error);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  });
