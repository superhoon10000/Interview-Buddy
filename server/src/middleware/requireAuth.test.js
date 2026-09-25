jest.mock("../firebaseAdmin", () => ({
  admin: {
    auth: jest.fn(),
  },
}));

const { admin } = require("../firebaseAdmin");
const requireAuth = require("./requireAuth");

function createResponse() {
  return {
    statusCode: 200,
    payload: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe("requireAuth middleware", () => {
  let verifyIdToken;

  beforeEach(() => {
    jest.clearAllMocks();

    verifyIdToken = jest.fn();

    admin.auth.mockReturnValue({
      verifyIdToken,
    });
  });

  it("accepts a valid Firebase ID token", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
      email_verified: true,
    });

    const req = {
      get: jest.fn().mockReturnValue(
        "Bearer valid-token"
      ),
    };

    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(verifyIdToken).toHaveBeenCalledWith(
      "valid-token"
    );

    expect(req.user).toEqual({
      uid: "user-123",
      email: "test@example.com",
      emailVerified: true,
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects a request without a bearer token", async () => {
    const req = {
      get: jest.fn().mockReturnValue(""),
    };

    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);

    expect(res.payload).toEqual({
      error: "Authentication is required.",
      code: "auth-token-required",
    });

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid Firebase ID token", async () => {
    verifyIdToken.mockRejectedValue(
      new Error("Invalid token")
    );

    const req = {
      get: jest.fn().mockReturnValue(
        "Bearer invalid-token"
      ),
    };

    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);

    expect(res.payload).toEqual({
      error:
        "The authentication token is invalid or expired.",
      code: "invalid-auth-token",
    });

    expect(next).not.toHaveBeenCalled();
  });
});