const COMMON_SKILLS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "express",
  "postgresql",
  "sql",
  "python",
  "java",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "git",
  "rest",
  "graphql",
  "redis",
  "microservices",
  "ci/cd",
  "leadership",
  "communication",
  "problem solving",
];

const KEYWORD_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "we",
  "with",
  "you",
  "your",
  "plus",
  "skills",
  "experience",
]);

function normalize(text) {
  return (text || "").toLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s+#./-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9+#/-]+|[^a-z0-9+#/-]+$/g, ""))
    .filter(Boolean);
}

function isMeaningfulToken(token) {
  if (!token || token.length < 3) {
    return false;
  }

  // Require at least one letter to avoid numeric and punctuation noise.
  if (!/[a-z]/.test(token)) {
    return false;
  }

  const cleaned = token.replace(/^[^a-z0-9+#/.-]+|[^a-z0-9+#/.-]+$/g, "");
  if (!cleaned || KEYWORD_STOPWORDS.has(cleaned)) {
    return false;
  }

  return true;
}

function extractSkills(text) {
  const normalized = normalize(text);
  const tokens = new Set(tokenize(text));

  return COMMON_SKILLS.filter((skill) => {
    if (skill.includes(" ") || skill.includes("/") || skill.includes("+")) {
      return normalized.includes(skill);
    }
    return tokens.has(skill);
  });
}

function extractExperienceYears(text) {
  const normalized = normalize(text);
  const matches = normalized.match(/(\d+)\+?\s*(years|yrs)/g) || [];

  let maxYears = 0;
  matches.forEach((snippet) => {
    const numeric = Number(snippet.match(/\d+/)?.[0] || 0);
    if (numeric > maxYears) {
      maxYears = numeric;
    }
  });

  return maxYears;
}

function extractMatchedPhrases(resumeText, jobText) {
  const resumeTokens = new Set(tokenize(resumeText).filter((token) => isMeaningfulToken(token)));
  const jobTokens = tokenize(jobText).filter((token) => isMeaningfulToken(token));

  const candidates = [];
  for (let i = 0; i < jobTokens.length; i += 1) {
    for (const size of [3, 2, 1]) {
      const chunk = jobTokens.slice(i, i + size);
      if (chunk.length !== size) {
        continue;
      }

      if (!chunk.every((token) => resumeTokens.has(token))) {
        continue;
      }

      if (size === 1 && chunk[0].length <= 4) {
        continue;
      }

      candidates.push({
        phrase: chunk.join(" "),
        start: i,
        end: i + size - 1,
        size,
      });
    }
  }

  const uniqueCandidates = [];
  const seenPhrases = new Set();
  for (const candidate of candidates) {
    if (!seenPhrases.has(candidate.phrase)) {
      seenPhrases.add(candidate.phrase);
      uniqueCandidates.push(candidate);
    }
  }

  uniqueCandidates.sort((a, b) => {
    if (b.size !== a.size) {
      return b.size - a.size;
    }
    return a.start - b.start;
  });

  const selected = [];
  const usedPositions = new Set();
  for (const candidate of uniqueCandidates) {
    let overlaps = false;
    for (let pos = candidate.start; pos <= candidate.end; pos += 1) {
      if (usedPositions.has(pos)) {
        overlaps = true;
        break;
      }
    }

    if (overlaps) {
      continue;
    }

    selected.push(candidate.phrase);
    for (let pos = candidate.start; pos <= candidate.end; pos += 1) {
      usedPositions.add(pos);
    }

    if (selected.length >= 20) {
      break;
    }
  }

  return selected;
}

function scoreMatch(resumeText, jobText) {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobText);

  const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));
  const matchedSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));

  const resumeTokens = new Set(tokenize(resumeText).filter((token) => isMeaningfulToken(token)));
  const jobTokens = Array.from(new Set(tokenize(jobText))).filter((token) => token.length > 3 && isMeaningfulToken(token));

  const keywordMatches = jobTokens.filter((token) => resumeTokens.has(token));
  const keywordCoverage = jobTokens.length
    ? keywordMatches.length / jobTokens.length
    : 0;

  const jobYears = extractExperienceYears(jobText);
  const resumeYears = extractExperienceYears(resumeText);
  const experienceCoverage = jobYears > 0 ? Math.min(resumeYears / jobYears, 1) : 1;

  const skillCoverage = jobSkills.length ? matchedSkills.length / jobSkills.length : 0.8;

  const weightedScore =
    skillCoverage * 0.55 +
    keywordCoverage * 0.3 +
    experienceCoverage * 0.15;

  const score = Math.max(0, Math.min(100, Math.round(weightedScore * 100)));

  const strengths = [];
  if (matchedSkills.length) {
    strengths.push(`Matched ${matchedSkills.length} required skills: ${matchedSkills.join(", ")}.`);
  }
  if (experienceCoverage >= 1) {
    strengths.push("Experience level meets or exceeds the role requirement.");
  }
  if (keywordCoverage >= 0.4) {
    strengths.push("Strong contextual keyword alignment across responsibilities.");
  }
  if (!strengths.length) {
    strengths.push("Profile has partial overlap; targeted upskilling can significantly improve fit.");
  }

  const keywordGaps = jobTokens
    .filter((token) => token.length > 4 && !resumeTokens.has(token))
    .slice(0, 20);

  const matchedPhrases = extractMatchedPhrases(resumeText, jobText);

  return {
    score,
    missingSkills,
    keywordGaps,
    strengthsSummary: strengths.join(" "),
    matchedPhrases,
  };
}

module.exports = {
  scoreMatch,
};
