
const createAccountDeletionRouter = require("./accountDeletion");

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe("DELETE /api/users/account", () => {
  let handler;
  let authClient;
  let accountDeletionService;
  let req;

  beforeEach(() => {
    authClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: "u1", auth_time: Math.floor(Date.now() / 1000),
      }),
    };
    accountDeletionService = {
      deleteAccount: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const router = createAccountDeletionRouter({ accountDeletionService, authClient });
    handler = router.stack.find((layer) => layer.route?.path === "/account")
      .route.stack[0].handle;
    req = {
      user: { uid: "u1" },
      body: { confirmation: "DELETE", uid: "victim" },
      get: () => "Bearer recent-token",
    };
  });

  test("uses the authenticated UID, never the request body's UID", async () => {
    const res = response();
    await handler(req, res, jest.fn());
    expect(authClient.verifyIdToken).toHaveBeenCalledWith("recent-token", true);
    expect(accountDeletionService.deleteAccount).toHaveBeenCalledWith("u1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  test("rejects missing confirmation", async () => {
    req.body = {};
    const res = response();
    await handler(req, res, jest.fn());
    expect(res.statusCode).toBe(400);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects mismatched identity", async () => {
    authClient.verifyIdToken.mockResolvedValue({ uid: "other", auth_time: Math.floor(Date.now() / 1000) });
    const res = response();
    await handler(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects authentication older than five minutes", async () => {
    authClient.verifyIdToken.mockResolvedValue({ uid: "u1", auth_time: Math.floor(Date.now() / 1000) - 600 });
    const res = response();
    await handler(req, res, jest.fn());
    expect(res.statusCode).toBe(403);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects revoked or invalid token", async () => {
    authClient.verifyIdToken.mockRejectedValue(new Error("revoked"));
    const res = response();
    await handler(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("passes cleanup failure to central error handler", async () => {
    accountDeletionService.deleteAccount.mockRejectedValue(new Error("cleanup failed"));
    const next = jest.fn();
    await handler(req, response(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "cleanup failed" }));
  });

  //Expand testing to verify:
  //Account deletion blocked without auth user or valid Bearer token
  //Invalid and susp. auth timestamps are rejected
  //Partial deletion failures return an appropriate error instead of reporting success
  //Unauth requests never reach deletion service
  test("rejects requests without an authenticated user", async () => {
    req.user = null;

    const res = response();
    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("auth-required");
    expect(authClient.verifyIdToken).not.toHaveBeenCalled();
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects requests without a valid Bearer authorization header", async () => {
    req.get = () => "Basic invalid-token";

    const res = response();
    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("auth-token-required");
    expect(authClient.verifyIdToken).not.toHaveBeenCalled();
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects tokens without a valid authentication timestamp", async () => {
    authClient.verifyIdToken.mockResolvedValue({
      uid: "u1",
      auth_time: "invalid",
    });

    const res = response();
    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("recent-login-required");
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("rejects authentication timestamps too far in the future", async () => {
    authClient.verifyIdToken.mockResolvedValue({
      uid: "u1",
      auth_time: Math.floor(Date.now() / 1000) + 120,
    });

    const res = response();
    await handler(req, res, jest.fn());

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("recent-login-required");
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test("reports partial deletion failure without returning success", async () => {
    const error = new Error(
      "The login was deleted, but final profile cleanup failed."
    );
    error.code = "account-deletion-partial";

    accountDeletionService.deleteAccount.mockRejectedValue(error);

    const res = response();
    const next = jest.fn();

    await handler(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: error.message,
      code: "account-deletion-partial",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
