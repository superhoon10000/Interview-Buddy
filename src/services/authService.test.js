
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

  test("login trims email before authenticating", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "daniel@example.com",
        displayName: "Daniel",
        emailVerified: false,
      },
    });

    await authService.login({
      email: "  daniel@example.com  ",
      password: "password123",
    });

    expect(
      signInWithEmailAndPassword
    ).toHaveBeenCalledWith(
      expect.anything(),
      "daniel@example.com",
      "password123"
    );
  });

  test("login rejects whitespace-only email before calling Firebase", async () => {
    await expect(
      authService.login({
        email: "   ",
        password: "password123",
      })
    ).rejects.toThrow(
      "Email and password are required."
    );

    expect(
      signInWithEmailAndPassword
    ).not.toHaveBeenCalled();
  });

  test("login maps invalid credential Firebase errors", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    await expect(
      authService.login({
        email: "daniel@example.com",
        password: "wrongpassword",
      })
    ).rejects.toMatchObject({
      code: "auth/invalid-credential",
      message: "Invalid email or password.",
    });
  });

  test("login maps invalid email Firebase errors", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-email",
    });

    await expect(
      authService.login({
        email: "not-an-email",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/invalid-email",
      message: "Please enter a valid email address.",
    });
  });

  test("login maps disabled account Firebase errors", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/user-disabled",
    });

    await expect(
      authService.login({
        email: "daniel@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/user-disabled",
      message: "This account has been disabled.",
    });
  });

  test("login maps too many requests Firebase errors", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/too-many-requests",
    });

    await expect(
      authService.login({
        email: "daniel@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/too-many-requests",
      message:
        "Too many login attempts. Please try again later.",
    });
  });

  test("login maps network Firebase errors", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/network-request-failed",
    });

    await expect(
      authService.login({
        email: "daniel@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/network-request-failed",
      message:
        "Unable to reach the authentication service. Please try again.",
    });
  });

  test("login maps unknown Firebase errors to a fallback application error", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/something-unexpected",
    });

    await expect(
      authService.login({
        email: "daniel@example.com",
        password: "password123",
      })
    ).rejects.toMatchObject({
      code: "auth/something-unexpected",
      message: "Login failed. Please try again.",
    });
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

  test(
    "Google login continues normally when an application profile already exists",
    async () => {
      const googleUser = {
        uid: "google-user-123",
        email:
          "daniel@gmail.com",
        displayName: "Daniel",
        emailVerified: true,
        getIdToken: jest
          .fn()
          .mockResolvedValue(
            "google-id-token"
          ),
      };

      signInWithPopup.mockResolvedValue({
        user: googleUser,
      });

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            uid:
              "google-user-123",
            username: "Daniel",
            usernameLower:
              "daniel",
            email:
              "daniel@gmail.com",
            role: "user",
            settings: {
              theme: "light",
            },
          },
        }),
      });

      const result =
        await authService.loginWithGoogle();

      expect(
        signInWithPopup
      ).toHaveBeenCalled();

      expect(
        googleUser.getIdToken
      ).toHaveBeenCalledTimes(1);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/users/profile",
        {
          method: "GET",
          headers: {
            Authorization:
              "Bearer google-id-token",
          },
        }
      );

      expect(result).toMatchObject({
        authenticated: true,
        needsUsernameSetup: false,
        user: {
          uid:
            "google-user-123",
          email:
            "daniel@gmail.com",
          username: "Daniel",
        },
      });
    }
  );

  test(
    "Google login requests username setup when the Firebase user has no application profile",
    async () => {
      const googleUser = {
        uid: "google-user-123",
        email:
          "newgoogle@gmail.com",
        displayName:
          "Google Person",
        emailVerified: true,
        getIdToken: jest
          .fn()
          .mockResolvedValue(
            "google-id-token"
          ),
      };

      signInWithPopup.mockResolvedValue({
        user: googleUser,
      });

      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error:
            "User profile was not found.",
          code:
            "profile-not-found",
        }),
      });

      const result =
        await authService.loginWithGoogle();

      expect(result).toMatchObject({
        authenticated: true,
        needsUsernameSetup: true,
        user: {
          uid:
            "google-user-123",
          email:
            "newgoogle@gmail.com",
        },
      });
    }
  );

  test(
    "Google profile setup creates the username chosen by the user",
    async () => {
      const googleUser = {
        uid: "google-user-123",
        email:
          "newgoogle@gmail.com",
        displayName:
          "Google Person",
        emailVerified: true,
        getIdToken: jest
          .fn()
          .mockResolvedValue(
            "google-id-token"
          ),
      };

      signInWithPopup.mockResolvedValue({
        user: googleUser,
      });

      // First request:
      // GET profile -> not found.
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            code:
              "profile-not-found",
          }),
        })

        // Second request:
        // POST chosen username.
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            profile: {
              uid:
                "google-user-123",
              username:
                "MyInterviewName",
              usernameLower:
                "myinterviewname",
              email:
                "newgoogle@gmail.com",
              role: "user",
              settings: {
                theme: "light",
              },
            },
          }),
        });

      await authService.loginWithGoogle();

      const result =
        await authService.completeGoogleProfile(
          "MyInterviewName"
        );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:5001/api/users/profile",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              "Bearer google-id-token",
          },
          body: JSON.stringify({
            username:
              "MyInterviewName",
          }),
        }
      );

      expect(
        result.user.username
      ).toBe(
        "MyInterviewName"
      );

      expect(
        result.needsUsernameSetup
      ).toBe(false);
    }
  );

  test(
    "Google profile setup generates a username when the user skips username creation",
    async () => {
      const googleUser = {
        uid:
          "F7Q8C5BnLjcvuDJr",
        email:
          "daniel@gmail.com",
        displayName:
          "Daniel Price",
        emailVerified: true,
        getIdToken: jest
          .fn()
          .mockResolvedValue(
            "google-id-token"
          ),
      };

      signInWithPopup.mockResolvedValue({
        user: googleUser,
      });

      global.fetch
        // Profile does not exist.
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            code:
              "profile-not-found",
          }),
        })

        // Generated username succeeds.
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            profile: {
              uid:
                "F7Q8C5BnLjcvuDJr",
              username:
                "daniel_f7q8c5",
              usernameLower:
                "daniel_f7q8c5",
              email:
                "daniel@gmail.com",
              role: "user",
              settings: {
                theme: "light",
              },
            },
          }),
        });

      await authService.loginWithGoogle();

      const result =
        await authService
          .completeGoogleProfileWithGeneratedUsername();

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:5001/api/users/profile",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username:
              "daniel_f7q8c5",
          }),
        })
      );

      expect(
        result.generatedUsername
      ).toBe(
        "daniel_f7q8c5"
      );

      expect(
        result.user.username
      ).toBe(
        "daniel_f7q8c5"
      );
    }
  );

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

  test("logout maps Firebase sign-out errors", async () => {
    signOut.mockRejectedValue({
      code: "auth/network-request-failed",
    });

    await expect(
      authService.logout()
    ).rejects.toMatchObject({
      code: "auth/network-request-failed",
      message: "Logout failed. Please try again.",
    });
  });
});