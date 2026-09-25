const createUserRouter = require("./users");

function getPostHandler(router) {
  const layer = router.stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === "/profile" &&
      entry.route.methods.post
  );

  return layer.route.stack[0].handle;
}

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

describe("POST /api/users/profile route", () => {
  let userRepository;
  let router;
  let handler;

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      createProfile: jest.fn(),
      findByUsername: jest.fn(),
    };

    router = createUserRouter({
      userRepository,
    });

    handler = getPostHandler(router);
  });

  it("creates a profile for the authenticated Firebase user", async () => {
    userRepository.findByUsername.mockResolvedValue(null);

    userRepository.createProfile.mockResolvedValue({
      uid: "user-123",
      username: "testuser",
      usernameLower: "testuser",
      email: "test@example.com",
    });

    const req = {
      user: {
        uid: "user-123",
        email: "test@example.com",
      },
      body: {
        username: "testuser",
      },
    };

    const res = createResponse();
    const next = jest.fn();

    await handler(req, res, next);

    expect(
      userRepository.findByUsername
    ).toHaveBeenCalledWith("testuser");

    expect(
      userRepository.createProfile
    ).toHaveBeenCalledWith({
      uid: "user-123",
      username: "testuser",
      email: "test@example.com",
    });

    expect(res.statusCode).toBe(201);

    expect(res.payload).toEqual({
      profile: {
        uid: "user-123",
        username: "testuser",
        usernameLower: "testuser",
        email: "test@example.com",
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests without an authenticated user", async () => {
    const req = {
      body: {
        username: "testuser",
      },
    };

    const res = createResponse();

    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(401);

    expect(res.payload).toEqual({
      error: "Authentication is required.",
    });

    expect(
      userRepository.createProfile
    ).not.toHaveBeenCalled();
  });

  it("requires a username", async () => {
    const req = {
      user: {
        uid: "user-123",
        email: "test@example.com",
      },
      body: {},
    };

    const res = createResponse();

    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(400);

    expect(res.payload).toEqual({
      error: "Username is required.",
    });
  });

  it("rejects a username already owned by another user", async () => {
    userRepository.findByUsername.mockResolvedValue({
      uid: "different-user",
      username: "testuser",
    });

    const req = {
      user: {
        uid: "user-123",
        email: "test@example.com",
      },
      body: {
        username: "testuser",
      },
    };

    const res = createResponse();

    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(409);

    expect(res.payload).toEqual({
      error: "That username is already in use.",
      code: "username-already-exists",
    });

    expect(
      userRepository.createProfile
    ).not.toHaveBeenCalled();
  });
});