jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: jest.fn(() => ({
    providerId: "google.com",
  })),
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { authService } from "./authService";

global.fetch = jest.fn();

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch.mockReset();

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          uid: "user-123",
          username: "testuser",
          usernameLower: "testuser",
          email: "test@example.com",
        },
      }),
    });
  });

  test("login authenticates with Firebase email and password", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "daniel@example.com",
        displayName: "Daniel",
        emailVerified: false,
      },
    });

    const result = await authService.login({
      email: "daniel@example.com",
      password: "password123",
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "daniel@example.com",
      "password123"
    );

    expect(result.authenticated).toBe(true);
    expect(result.user.email).toBe("daniel@example.com");
    expect(result.user.username).toBe("Daniel");
  });



  test("login rejects missing credentials", async () => {
    await expect(
      authService.login({
        email: "",
        password: "",
      })
    ).rejects.toThrow("Email and password are required.");
  });

  test("register creates Firebase user, application profile, and signs out", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "daniel@example.com",
      displayName: null,
      emailVerified: false,
      getIdToken: jest
        .fn()
        .mockResolvedValue("test-id-token"),
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(
      async (user, profile) => {
        user.displayName = profile.displayName;
      }
    );

    signOut.mockResolvedValue();

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          uid: "user-123",
          username: "Daniel",
          usernameLower: "daniel",
          email: "daniel@example.com",
        },
      }),
    });

    const result = await authService.register({
      username: "Daniel",
      email: "daniel@example.com",
      password: "password123",
    });

    expect(
      createUserWithEmailAndPassword
    ).toHaveBeenCalledWith(
      expect.anything(),
      "daniel@example.com",
      "password123"
    );

    expect(updateProfile).toHaveBeenCalledWith(
      firebaseUser,
      {
        displayName: "Daniel",
      }
    );

    expect(
      firebaseUser.getIdToken
    ).toHaveBeenCalledTimes(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/users/profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-id-token",
        },
        body: JSON.stringify({
          username: "Daniel",
        }),
      }
    );

    expect(signOut).toHaveBeenCalledWith(
      expect.anything()
    );

    expect(deleteUser).not.toHaveBeenCalled();

    expect(result).toEqual({
      created: true,
      user: {
        uid: "user-123",
        email: "daniel@example.com",
        username: "Daniel",
        emailVerified: false,
      },
    });
  });

  test("register trims username and email before creating the user and profile", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "test@example.com",
      displayName: null,
      emailVerified: false,
      getIdToken: jest
        .fn()
        .mockResolvedValue("test-id-token"),
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(
      async (user, profile) => {
        user.displayName = profile.displayName;
      }
    );

    signOut.mockResolvedValue();

    await authService.register({
      username: "  testuser  ",
      email: "  test@example.com  ",
      password: "password123",
    });

    expect(
      createUserWithEmailAndPassword
    ).toHaveBeenCalledWith(
      expect.anything(),
      "test@example.com",
      "password123"
    );

    expect(updateProfile).toHaveBeenCalledWith(
      firebaseUser,
      {
        displayName: "testuser",
      }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/users/profile",
      expect.objectContaining({
        body: JSON.stringify({
          username: "testuser",
        }),
      })
    );
  });

  test("register rejects whitespace-only username", async () => {
    await expect(
      authService.register({
        username: "   ",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toThrow(
      "Username, email, and password are required."
    );

    expect(
      createUserWithEmailAndPassword
    ).not.toHaveBeenCalled();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("register maps duplicate email Firebase errors", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/email-already-in-use",
      message:
        "An account with this email already exists.",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("register returns a safe fallback for unknown Firebase errors", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/something-unexpected",
    });

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/something-unexpected",
      message:
        "Account creation failed. Please try again.",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("register rolls back Firebase account when Firebase profile setup fails", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "test@example.com",
      displayName: null,
      emailVerified: false,
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockRejectedValue(
      new Error("Profile update failed")
    );

    deleteUser.mockResolvedValue();

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/profile-setup-failed",
      message:
        "Registration could not be completed because the username could not be saved. Please try again.",
    });

    expect(deleteUser).toHaveBeenCalledWith(
      firebaseUser
    );

    expect(global.fetch).not.toHaveBeenCalled();

    expect(signOut).not.toHaveBeenCalled();
  });

  test("register reports rollback failure when incomplete Firebase account cannot be deleted", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "test@example.com",
      displayName: null,
      emailVerified: false,
      getIdToken: jest
        .fn()
        .mockResolvedValue("test-id-token"),
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(
      async (user, profile) => {
        user.displayName = profile.displayName;
      }
    );

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "That username is already in use.",
        code: "username-already-exists",
      }),
    });

    deleteUser.mockRejectedValue(
      new Error("Delete failed")
    );

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/registration-rollback-failed",
      message:
        "Registration could not be completed, and the partially created account could not be removed. Please contact support or try signing in.",
    });

    expect(deleteUser).toHaveBeenCalledWith(
      firebaseUser
    );
  });

  test("register rolls back Firebase account when backend profile creation fails", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "test@example.com",
      displayName: null,
      emailVerified: false,
      getIdToken: jest
        .fn()
        .mockResolvedValue("test-id-token"),
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(
      async (user, profile) => {
        user.displayName = profile.displayName;
      }
    );

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "That username is already in use.",
        code: "username-already-exists",
      }),
    });

    deleteUser.mockResolvedValue();

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "username-already-exists",
      message: "That username is already in use.",
    });

    expect(
      firebaseUser.getIdToken
    ).toHaveBeenCalledTimes(1);

    expect(global.fetch).toHaveBeenCalled();

    expect(deleteUser).toHaveBeenCalledWith(
      firebaseUser
    );

    expect(signOut).not.toHaveBeenCalled();
  });

  ////////////

  test("register reports post-registration sign-out failure", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "test@example.com",
      displayName: null,
      emailVerified: false,
      getIdToken: jest
        .fn()
        .mockResolvedValue("test-id-token"),
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(
      async (user, profile) => {
        user.displayName = profile.displayName;
      }
    );

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          uid: "user-123",
          username: "testuser",
          usernameLower: "testuser",
          email: "test@example.com",
        },
      }),
    });

    signOut.mockRejectedValue(
      new Error("Sign out failed")
    );

    await expect(
      authService.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/post-registration-signout-failed",
      message:
        "Your account was created, but automatic sign-out failed. Please sign out before continuing.",
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test("Google login authenticates through Firebase", async () => {
    signInWithPopup.mockResolvedValue({
      user: {
        uid: "google-user-123",
        email: "daniel@gmail.com",
        displayName: "Daniel",
        emailVerified: true,
      },
    });

    const result =
      await authService.loginWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();

    expect(result.authenticated).toBe(true);
    expect(result.user.email).toBe(
      "daniel@gmail.com"
    );
  });

  test("subscribeToAuthState maps Firebase user changes", () => {
    const callback = jest.fn();
    const unsubscribe = jest.fn();

    onAuthStateChanged.mockImplementation(
      (auth, listener) => {
        listener({
          uid: "user-123",
          email: "daniel@example.com",
          displayName: "Daniel",
          emailVerified: true,
        });

        return unsubscribe;
      }
    );

    const result =
      authService.subscribeToAuthState(callback);

    expect(onAuthStateChanged).toHaveBeenCalled();

    expect(callback).toHaveBeenCalledWith({
      uid: "user-123",
      email: "daniel@example.com",
      username: "Daniel",
      emailVerified: true,
    });

    expect(result).toBe(unsubscribe);
  });

  test("subscribeToAuthState rejects a missing callback", () => {
    expect(() => {
      authService.subscribeToAuthState();
    }).toThrow(
      "Auth state callback is required."
    );
  });

  test("logout signs out through Firebase", async () => {
    signOut.mockResolvedValue();

    const result = await authService.logout();

    expect(signOut).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
    });
  });
});