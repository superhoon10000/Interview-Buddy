function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(normalize).filter(Boolean);
}

/**
 * Express can represent a repeated query parameter as an array, while the
 * frontend may also choose to send a comma-separated tag list. Support both
 * forms so the backend contract stays simple:
 *
 *   ?tags=tree&tags=bfs
 *   ?tags=tree,bfs
 */
function parseSelectedTags(value) {
  const values = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      values
        .flatMap((entry) => String(entry || "").split(","))
        .map(normalize)
        .filter(Boolean)
    ),
  ];
}

function getMatchingTagCount(question, selectedTags) {
  const questionTags = new Set(normalizeArray(question.tags));

  return selectedTags.reduce(
    (count, tag) => count + (questionTags.has(tag) ? 1 : 0),
    0
  );
}

function matchesRequiredSetup(question, setup) {
  const jobRole = normalize(setup.jobRole);
  const experienceLevel = normalize(setup.experienceLevel);

  const jobRoles = new Set(normalizeArray(question.jobRoles));
  const experienceLevels = new Set(normalizeArray(question.experienceLevels));

  return jobRoles.has(jobRole) && experienceLevels.has(experienceLevel);
}

/**
 * Select questions using the stored Firestore metadata.
 *
 * A question is eligible only when:
 *   1. it is active;
 *   2. its jobRoles contains the selected job role;
 *   3. its experienceLevels contains the selected experience level; and
 *   4. at least one stored question tag matches a selected tag.
 *
 * Eligible questions are ordered by the number of matching tags first. The
 * existing priority field is only a tie-breaker, so a two-tag match always
 * outranks a one-tag match.
 */
function selectQuestions(questions, setup, limit = 10) {
  const selectedTags = parseSelectedTags(setup.tags);

  if (!setup.jobRole || !setup.experienceLevel || selectedTags.length === 0) {
    return [];
  }

  return questions
    .filter((question) => question.active !== false)
    .filter((question) => matchesRequiredSetup(question, setup))
    .map((question) => ({
      question,
      matchingTagCount: getMatchingTagCount(question, selectedTags),
    }))
    .filter(({ matchingTagCount }) => matchingTagCount >= 1)
    .sort((a, b) => {
      if (b.matchingTagCount !== a.matchingTagCount) {
        return b.matchingTagCount - a.matchingTagCount;
      }

      const priorityDifference =
        Number(b.question.priority || 0) - Number(a.question.priority || 0);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return String(a.question.id || "").localeCompare(
        String(b.question.id || "")
      );
    })
    .slice(0, limit)
    .map(({ question }) => question);
}

module.exports = {
  parseSelectedTags,
  selectQuestions,
};
