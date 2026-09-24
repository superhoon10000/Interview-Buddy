import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "../config/firebase";

function mapFirebaseUser(user) {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    username: user.displayName || "",
    emailVerified: user.emailVerified,
  };
}

export const authService = {
  async login(credentials) {
    if (!credentials) {
      throw new Error("Login credentials are required.");
    }

    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    return {
      authenticated: true,
      user: mapFirebaseUser(userCredential.user),
    };
  },

  async register(userData) {
    if (!userData) {
      throw new Error("Registration data is required.");
    }

    const { username, email, password } = userData;

    if (!username || !email || !password) {
      throw new Error(
        "Username, email, and password are required."
      );
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    await updateProfile(userCredential.user, {
      displayName: username.trim(),
    });

    return {
      created: true,
      user: mapFirebaseUser(userCredential.user),
    };
  },

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    const userCredential = await signInWithPopup(
      auth,
      provider
    );

    return {
      authenticated: true,
      user: mapFirebaseUser(userCredential.user),
    };
  },

  async logout() {
    await signOut(auth);

    return {
      success: true,
    };
  },

  getCurrentUser() {
    return mapFirebaseUser(auth.currentUser);
  },

  async changePassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error(
        "Current and new passwords are required."
      );
    }

    if (currentPassword === newPassword) {
      throw new Error(
        "New password cannot be the same as the current password."
      );
    }

    // Password-change functionality will be connected separately.
    throw new Error(
      "Password change is not implemented yet."
    );
  },
};