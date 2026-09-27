const createUserRouter = require("./users");

function getRouteHandler(router, path, method) {
  const layer = router.stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === path &&
      entry.route.methods[method]
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

describe("users routes", () => {
  let userRepository;
  let router;

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      createProfile: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      updateProfile: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };

    router = createUserRouter({
      userRepository,
    });
  });

  describe("POST /api/users/profile", () => {
    let handler;

    beforeEach(() => {
      handler = getRouteHandler(
        router,
        "/profile",
        "post"
      );
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

  describe("GET /api/users/profile", () => {
    let handler;

    beforeEach(() => {
      handler = getRouteHandler(
        router,
        "/profile",
        "get"
      );
    });

    it("returns the authenticated user's persisted profile", async () => {
      userRepository.findById.mockResolvedValue({
        uid: "user-123",
        username: "testuser",
        email: "test@example.com",
      });

      const req = {
        user: {
          uid: "user-123",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await handler(req, res, next);

      expect(
        userRepository.findById
      ).toHaveBeenCalledWith("user-123");

      expect(res.statusCode).toBe(200);

      expect(res.payload).toEqual({
        profile: {
          uid: "user-123",
          username: "testuser",
          email: "test@example.com",
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("returns 404 when the profile does not exist", async () => {
      userRepository.findById.mockResolvedValue(null);

      const req = {
        user: {
          uid: "user-123",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(404);

      expect(res.payload).toEqual({
        error: "User profile was not found.",
        code: "profile-not-found",
      });
    });

    it("rejects unauthenticated requests", async () => {
      const req = {};

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(401);

      expect(
        userRepository.findById
      ).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/users/profile", () => {
    let handler;

    beforeEach(() => {
      handler = getRouteHandler(
        router,
        "/profile",
        "patch"
      );
    });

    it("updates supported profile fields", async () => {
      userRepository.updateProfile.mockResolvedValue({
        uid: "user-123",
        username: "newname",
        displayName: "New Name",
      });

      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          username: "newname",
          displayName: "New Name",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await handler(req, res, next);

      expect(
        userRepository.updateProfile
      ).toHaveBeenCalledWith("user-123", {
        username: "newname",
        displayName: "New Name",
      });

      expect(res.statusCode).toBe(200);

      expect(res.payload).toEqual({
        profile: {
          uid: "user-123",
          username: "newname",
          displayName: "New Name",
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("rejects an empty username", async () => {
      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          username: "   ",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(400);

      expect(res.payload).toEqual({
        error: "Username cannot be empty.",
      });

      expect(
        userRepository.updateProfile
      ).not.toHaveBeenCalled();
    });

    it("rejects requests with no supported fields", async () => {
      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          email: "changed@example.com",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(400);

      expect(
        userRepository.updateProfile
      ).not.toHaveBeenCalled();
    });

    it("returns 404 when the user profile does not exist", async () => {
      userRepository.updateProfile.mockResolvedValue(null);

      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          displayName: "New Name",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(404);
    });

    it("returns 409 when the username is already in use", async () => {
      const error = new Error(
        "That username is already in use."
      );

      error.code = "username-already-exists";

      userRepository.updateProfile.mockRejectedValue(
        error
      );

      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          username: "takenname",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(409);

      expect(res.payload).toEqual({
        error: "That username is already in use.",
        code: "username-already-exists",
      });
    });
  });

  describe("GET /api/users/settings", () => {
    let handler;

    beforeEach(() => {
      handler = getRouteHandler(
        router,
        "/settings",
        "get"
      );
    });

    it("returns persisted settings for the authenticated user", async () => {
      userRepository.getSettings.mockResolvedValue({
        theme: "dark",
        notifications: true,
      });

      const req = {
        user: {
          uid: "user-123",
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await handler(req, res, next);

      expect(
        userRepository.getSettings
      ).toHaveBeenCalledWith("user-123");

      expect(res.statusCode).toBe(200);

      expect(res.payload).toEqual({
        settings: {
          theme: "dark",
          notifications: true,
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("returns 404 when the user profile does not exist", async () => {
      userRepository.getSettings.mockResolvedValue(null);

      const req = {
        user: {
          uid: "user-123",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/users/settings", () => {
    let handler;

    beforeEach(() => {
      handler = getRouteHandler(
        router,
        "/settings",
        "patch"
      );
    });

    it("updates supported user settings", async () => {
      userRepository.updateSettings.mockResolvedValue({
        theme: "dark",
        notifications: false,
      });

      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          theme: "dark",
          notifications: false,
        },
      };

      const res = createResponse();
      const next = jest.fn();

      await handler(req, res, next);

      expect(
        userRepository.updateSettings
      ).toHaveBeenCalledWith("user-123", {
        theme: "dark",
        notifications: false,
      });

      expect(res.statusCode).toBe(200);

      expect(res.payload).toEqual({
        settings: {
          theme: "dark",
          notifications: false,
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("rejects invalid theme values", async () => {
      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          theme: "blue",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(400);

      expect(
        userRepository.updateSettings
      ).not.toHaveBeenCalled();
    });

    it("rejects non-boolean notification values", async () => {
      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          notifications: "yes",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(400);

      expect(
        userRepository.updateSettings
      ).not.toHaveBeenCalled();
    });

    it("rejects requests with no supported settings", async () => {
      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          language: "en",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(400);

      expect(
        userRepository.updateSettings
      ).not.toHaveBeenCalled();
    });

    it("returns 404 when the user profile does not exist", async () => {
      userRepository.updateSettings.mockResolvedValue(
        null
      );

      const req = {
        user: {
          uid: "user-123",
        },
        body: {
          theme: "dark",
        },
      };

      const res = createResponse();

      await handler(req, res, jest.fn());

      expect(res.statusCode).toBe(404);
    });
  });
});