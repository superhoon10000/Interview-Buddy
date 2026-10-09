const getHealthPayload = require("./health");

describe("health deployment metadata", () => {
  test("contains the source revision and CI build version", () => {
    expect(getHealthPayload({
      BUILD_VERSION: "IB-build-35.1-a73bf21",
      SOURCE_COMMIT_SHA: "a73bf21a73bf21a73bf21a73bf21a73bf21a",
    })).toEqual({
      status: "ok",
      service: "interview-buddy-api",
      buildVersion: "IB-build-35.1-a73bf21",
      sourceCommitSha: "a73bf21a73bf21a73bf21a73bf21a",
    });
  });

  test("is safe for local development without CI variables", () => {
    expect(getHealthPayload({})).toEqual({
      status: "ok",
      service: "interview-buddy-api",
      buildVersion: "local",
      sourceCommitSha: "local",
    });
  });
});
