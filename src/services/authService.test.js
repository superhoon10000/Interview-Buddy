jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: jest.fn(() => ({
    providerId: "google.com",
  })),
  createUserWithEmailAndPassword: jest.fn(),
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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { authService } from "./authService";

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test("register creates a Firebase user", async () => {
    const firebaseUser = {
      uid: "user-123",
      email: "daniel@example.com",
      displayName: null,
      emailVerified: false,
    };

    createUserWithEmailAndPassword.mockResolvedValue({
      user: firebaseUser,
    });

    updateProfile.mockImplementation(async (user, profile) => {
      user.displayName = profile.displayName;
    });

    const result = await authService.register({
      username: "Daniel",
      email: "daniel@example.com",
      password: "password123",
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "daniel@example.com",
      "password123"
    );

    expect(updateProfile).toHaveBeenCalledWith(firebaseUser, {
      displayName: "Daniel",
    });

    expect(result.created).toBe(true);
    expect(result.user.username).toBe("Daniel");
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

    const result = await authService.loginWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.authenticated).toBe(true);
    expect(result.user.email).toBe("daniel@gmail.com");
  });

  test("subscribeToAuthState maps Firebase user changes", () => {
    const callback = jest.fn();
    const unsubscribe = jest.fn();

    onAuthStateChanged.mockImplementation((auth, listener) => {
      listener({
        uid: "user-123",
        email: "daniel@example.com",
        displayName: "Daniel",
        emailVerified: true,
      });

      return unsubscribe;
    });

    const result = authService.subscribeToAuthState(callback);

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
    }).toThrow("Auth state callback is required.");
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