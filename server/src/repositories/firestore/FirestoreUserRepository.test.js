const FirestoreUserRepository = require(
  "./FirestoreUserRepository"
);

describe("FirestoreUserRepository", () => {
  let db;
  let admin;
  let repository;

  let setMock;
  let getMock;
  let docMock;
  let whereMock;
  let limitMock;
  let collectionMock;

  beforeEach(() => {
    jest.clearAllMocks();

    setMock = jest.fn();
    getMock = jest.fn();

    docMock = jest.fn(() => ({
      set: setMock,
      get: getMock,
    }));

    limitMock = jest.fn();

    whereMock = jest.fn(() => ({
      limit: limitMock,
    }));

    collectionMock = jest.fn(() => ({
      doc: docMock,
      where: whereMock,
    }));

    db = {
      collection: collectionMock,
    };

    admin = {
      firestore: {
        FieldValue: {
          serverTimestamp: jest.fn(
            () => "mock-server-timestamp"
          ),
        },
      },
    };

    repository = new FirestoreUserRepository({
      db,
      admin,
    });
  });

  test("creates a normalized user profile", async () => {
    limitMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        empty: true,
        docs: [],
      }),
    });

    setMock.mockResolvedValue();

    const result = await repository.createProfile({
      uid: " user-123 ",
      username: " TestUser ",
      email: " test@example.com ",
    });

    expect(collectionMock).toHaveBeenCalledWith(
      "users"
    );

    expect(docMock).toHaveBeenCalledWith(
      "user-123"
    );

    expect(setMock).toHaveBeenCalledWith({
      uid: "user-123",
      username: "TestUser",
      usernameLower: "testuser",
      email: "test@example.com",
      createdAt: "mock-server-timestamp",
      updatedAt: "mock-server-timestamp",
    });

    expect(result).toEqual({
      uid: "user-123",
      username: "TestUser",
      usernameLower: "testuser",
      email: "test@example.com",
      createdAt: "mock-server-timestamp",
      updatedAt: "mock-server-timestamp",
    });
  });

  test("rejects a username owned by another user", async () => {
    limitMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "different-user",
            data: () => ({
              uid: "different-user",
              username: "TestUser",
              usernameLower: "testuser",
            }),
          },
        ],
      }),
    });

    await expect(
      repository.createProfile({
        uid: "user-123",
        username: "TestUser",
        email: "test@example.com",
      })
    ).rejects.toMatchObject({
      code: "username-already-exists",
      message: "That username is already in use.",
    });

    expect(setMock).not.toHaveBeenCalled();
  });

  test("findByUsername performs a lowercase username lookup", async () => {
    const queryGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "user-123",
          data: () => ({
            uid: "user-123",
            username: "TestUser",
            usernameLower: "testuser",
            email: "test@example.com",
          }),
        },
      ],
    });

    limitMock.mockReturnValue({
      get: queryGet,
    });

    const result =
      await repository.findByUsername(
        "  TESTUSER  "
      );

    expect(whereMock).toHaveBeenCalledWith(
      "usernameLower",
      "==",
      "testuser"
    );

    expect(limitMock).toHaveBeenCalledWith(1);

    expect(result).toEqual({
      id: "user-123",
      uid: "user-123",
      username: "TestUser",
      usernameLower: "testuser",
      email: "test@example.com",
    });
  });

  test("findByUsername returns null when no profile exists", async () => {
    limitMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        empty: true,
        docs: [],
      }),
    });

    const result =
      await repository.findByUsername(
        "missinguser"
      );

    expect(result).toBeNull();
  });

  test("findById returns the stored user profile", async () => {
    getMock.mockResolvedValue({
      exists: true,
      id: "user-123",
      data: () => ({
        uid: "user-123",
        username: "TestUser",
        usernameLower: "testuser",
        email: "test@example.com",
      }),
    });

    const result =
      await repository.findById("user-123");

    expect(docMock).toHaveBeenCalledWith(
      "user-123"
    );

    expect(result).toEqual({
      id: "user-123",
      uid: "user-123",
      username: "TestUser",
      usernameLower: "testuser",
      email: "test@example.com",
    });
  });

  test("findById returns null when user does not exist", async () => {
    getMock.mockResolvedValue({
      exists: false,
    });

    const result =
      await repository.findById("user-123");

    expect(result).toBeNull();
  });

  test("createProfile rejects missing required fields", async () => {
    await expect(
      repository.createProfile({
        uid: "",
        username: "",
        email: "",
      })
    ).rejects.toThrow(
      "uid, username, and email are required to create a user profile."
    );

    expect(setMock).not.toHaveBeenCalled();
  });
});