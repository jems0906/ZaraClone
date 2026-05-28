const test = require("node:test");
const assert = require("node:assert/strict");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const DEMO_EMAIL = "demo@talentmatch.local";
const DEMO_PASSWORD = "TalentMatch123!";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await response.text();

  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

async function isApiReady() {
  try {
    const { response, body } = await requestJson("/health");
    return response.ok && body?.ok === true;
  } catch {
    return false;
  }
}

async function ensureApiReady(t) {
  if (await isApiReady()) {
    return;
  }

  if (process.env.CI) {
    assert.fail(`API is not ready at ${API_BASE_URL}`);
    return;
  }

  t.skip(`API is not ready at ${API_BASE_URL}`);
}

async function loginDemoUser() {
  const login = await requestJson("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });

  assert.equal(login.response.status, 200);
  assert.ok(login.body?.token, "Expected auth token");
  return login.body.token;
}

async function createMatchFixture(token, suffix) {
  const createJob = await requestJson("/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Integration Frontend ${suffix}`,
      company: "TalentMatch QA",
      description: "Need React JavaScript CSS HTML REST Git communication and performance optimization skills.",
    }),
  });

  assert.equal(createJob.response.status, 201);
  assert.ok(createJob.body?.id, "Expected created job id");

  const formData = new FormData();
  formData.append("title", `Integration Resume ${suffix}`);
  formData.append(
    "resume",
    new Blob(
      [
        "Frontend engineer with React JavaScript CSS HTML REST APIs Git communication and performance optimization experience.",
      ],
      { type: "text/plain" }
    ),
    `integration-resume-${suffix}.txt`
  );

  const createResume = await requestJson("/resumes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  assert.equal(createResume.response.status, 201);
  assert.ok(createResume.body?.id, "Expected created resume id");

  const createMatch = await requestJson("/matches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resumeId: createResume.body.id,
      jobId: createJob.body.id,
    }),
  });

  assert.equal(createMatch.response.status, 201);
  return {
    createJob,
    createResume,
    createMatch,
  };
}

test("POST /matches returns expected analysis payload", async (t) => {
  await ensureApiReady(t);

  const token = await loginDemoUser();
  const now = Date.now();
  const { createMatch } = await createMatchFixture(token, now);

  assert.equal(typeof createMatch.body?.id, "number");
  assert.equal(typeof createMatch.body?.score, "number");
  assert.ok(createMatch.body.score >= 0 && createMatch.body.score <= 100);
  assert.ok(Array.isArray(createMatch.body?.missing_skills));
  assert.ok(Array.isArray(createMatch.body?.keyword_gaps));
  assert.ok(Array.isArray(createMatch.body?.matched_phrases));
  assert.equal(typeof createMatch.body?.strengths_summary, "string");
});

test("GET /matches/:id returns detailed report payload", async (t) => {
  await ensureApiReady(t);

  const token = await loginDemoUser();
  const now = Date.now();
  const { createMatch, createResume, createJob } = await createMatchFixture(token, now);

  const details = await requestJson(`/matches/${createMatch.body.id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(details.response.status, 200);
  assert.equal(details.body.id, createMatch.body.id);
  assert.equal(details.body.resume_id, createResume.body.id);
  assert.equal(details.body.job_id, createJob.body.id);
  assert.equal(typeof details.body.resume_title, "string");
  assert.equal(typeof details.body.job_title, "string");
  assert.equal(typeof details.body.parsed_text, "string");
  assert.equal(typeof details.body.description_text, "string");
  assert.ok(Array.isArray(details.body.missing_skills));
  assert.ok(Array.isArray(details.body.keyword_gaps));
  assert.ok(Array.isArray(details.body.matched_phrases));
  assert.equal(typeof details.body.strengths_summary, "string");
});

test("GET /matches/:id returns 404 for unknown match", async (t) => {
  await ensureApiReady(t);

  const token = await loginDemoUser();
  const unknownId = 2147483647;

  const details = await requestJson(`/matches/${unknownId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(details.response.status, 404);
  assert.equal(details.body?.error, "Match not found");
});

test("protected endpoints return 401 when auth token is missing", async (t) => {
  await ensureApiReady(t);

  const checks = [
    { method: "GET", path: "/jobs" },
    { method: "GET", path: "/resumes" },
    { method: "GET", path: "/matches/history" },
    {
      method: "POST",
      path: "/matches",
      body: { resumeId: 1, jobId: 1 },
    },
  ];

  for (const check of checks) {
    const options = {
      method: check.method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (check.body) {
      options.body = JSON.stringify(check.body);
    }

    const result = await requestJson(check.path, options);
    assert.equal(result.response.status, 401, `${check.method} ${check.path} should return 401`);
    assert.equal(result.body?.error, "Missing or invalid auth token");
  }
});

test("protected endpoints return 401 when auth token is invalid", async (t) => {
  await ensureApiReady(t);

  const checks = [
    { method: "GET", path: "/jobs" },
    { method: "GET", path: "/resumes" },
    { method: "GET", path: "/matches/history" },
  ];

  for (const check of checks) {
    const result = await requestJson(check.path, {
      method: check.method,
      headers: {
        Authorization: "Bearer not.a.valid.token",
      },
    });

    assert.equal(result.response.status, 401, `${check.method} ${check.path} should return 401`);
    assert.equal(result.body?.error, "Invalid token");
  }
});
