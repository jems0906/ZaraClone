const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreMatch } = require("./matchingService");

test("does not infer java skill from javascript", () => {
  const resume = "JavaScript React CSS HTML Git";
  const job = "Looking for engineer with Java and React experience";

  const result = scoreMatch(resume, job);

  assert.ok(result.missingSkills.includes("java"));
  assert.ok(!result.missingSkills.includes("react"));
});

test("filters noisy stopwords from keyword gaps", () => {
  const resume = "JavaScript React CSS HTML REST API Git communication";
  const job = "Need JavaScript React CSS HTML REST API integration testing and communication skills plus";

  const result = scoreMatch(resume, job);

  assert.ok(!result.keywordGaps.includes("skills"));
  assert.ok(!result.keywordGaps.includes("plus"));
  assert.ok(result.keywordGaps.includes("integration"));
  assert.ok(result.keywordGaps.includes("testing"));
});

test("selects cleaner non-overlapping matched phrases", () => {
  const resume = "Frontend developer JavaScript React CSS HTML REST APIs Git Performance Optimization Communication";
  const job = "Frontend engineer with JavaScript React CSS HTML REST API integration Git testing communication and performance optimization";

  const result = scoreMatch(resume, job);

  assert.ok(result.matchedPhrases.some((phrase) => phrase.includes("performance optimization")));
  assert.ok(result.matchedPhrases.includes("javascript react css"));
  assert.ok(!result.matchedPhrases.includes("react css"));
  assert.ok(!result.matchedPhrases.includes("performance"));
});

test("always returns score in valid 0-100 range", () => {
  const result = scoreMatch("", "");
  assert.ok(result.score >= 0 && result.score <= 100);
});
