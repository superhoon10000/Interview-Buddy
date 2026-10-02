const {
  parseSelectedTags,
  selectQuestions,
} = require("./questionSelection");

describe("questionSelection", () => {
  test("parses comma-separated and repeated tags without duplicates", () => {
    expect(parseSelectedTags(["tree,bfs", "BFS", " queue "])).toEqual([
      "tree",
      "bfs",
      "queue",
    ]);
  });

  test("requires role, experience level, and at least one matching tag", () => {
    const questions = [
      {
        id: "both-tags",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree", "bfs"],
        priority: 1,
      },
      {
        id: "wrong-role",
        active: true,
        jobRoles: ["frontend developer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree", "bfs"],
        priority: 100,
      },
      {
        id: "wrong-experience",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Experienced"],
        tags: ["tree", "bfs"],
        priority: 100,
      },
      {
        id: "wrong-tags",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["arrays"],
        priority: 100,
      },
      {
        id: "inactive",
        active: false,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree", "bfs"],
        priority: 100,
      },
    ];

    const result = selectQuestions(questions, {
      jobRole: "Software Engineer",
      experienceLevel: "intermediate",
      tags: ["tree", "bfs"],
    });

    expect(result.map((question) => question.id)).toEqual(["both-tags"]);
  });

  test("prioritizes questions matching more selected tags before priority", () => {
    const questions = [
      {
        id: "tree-only-high-priority",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree"],
        priority: 100,
      },
      {
        id: "tree-and-bfs-low-priority",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree", "bfs"],
        priority: 1,
      },
      {
        id: "bfs-only-medium-priority",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["bfs"],
        priority: 50,
      },
    ];

    const result = selectQuestions(
      questions,
      {
        jobRole: "software engineer",
        experienceLevel: "Intermediate",
        tags: ["tree", "bfs"],
      },
      3
    );

    expect(result.map((question) => question.id)).toEqual([
      "tree-and-bfs-low-priority",
      "tree-only-high-priority",
      "bfs-only-medium-priority",
    ]);
  });

  test("applies the final question limit after tag ranking", () => {
    const questions = [
      {
        id: "one-tag",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree"],
        priority: 100,
      },
      {
        id: "two-tags",
        active: true,
        jobRoles: ["software engineer"],
        experienceLevels: ["Intermediate"],
        tags: ["tree", "bfs"],
        priority: 1,
      },
    ];

    const result = selectQuestions(
      questions,
      {
        jobRole: "software engineer",
        experienceLevel: "Intermediate",
        tags: ["tree", "bfs"],
      },
      1
    );

    expect(result.map((question) => question.id)).toEqual(["two-tags"]);
  });
});
