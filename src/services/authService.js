import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "../config/firebase";

const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5001/api"
).replace(/\/$/, "");

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

async function createUserProfile(user, username) {
  const idToken = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/users/profile`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        username,
      }),
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Leave payload null so the fallback error can be used.
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error ||
        "User profile could not be created."
    );

    error.code =
      payload?.code || "profile-creation-failed";

    throw error;
  }

  return payload?.profile || null;
}


async function rollbackRegistration(user) {
  try {
    await deleteUser(user);
    return true;
  } catch {
    return false;
  }
}

function createRegistrationError(error) {
  const messages = {
    "auth/email-already-in-use":
      "An account with this email already exists.",
    "auth/invalid-email":
      "Please enter a valid email address.",
    "auth/weak-password":
      "Password does not meet the required strength.",
    "auth/network-request-failed":
      "Unable to reach the authentication service. Please try again.",
    "auth/too-many-requests":
      "Too many registration attempts. Please try again later.",
  };

  const registrationError = new Error(
    messages[error?.code] ||
      "Account creation failed. Please try again."
  );

  registrationError.code =
    error?.code || "auth/registration-failed";

  return registrationError;
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

    const userCredential =
      await signInWithEmailAndPassword(
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

    const normalizedUsername = username?.trim();
    const normalizedEmail = email?.trim();

    if (
      !normalizedUsername ||
      !normalizedEmail ||
      !password
    ) {
      throw new Error(
        "Username, email, and password are required."
      );
    }

    let userCredential;

    // Step 1: Create the Firebase Authentication account.
    try {
      userCredential =
        await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );
    } catch (error) {
      throw createRegistrationError(error);
    }

    // Step 2: Store the username on the Firebase Auth profile.
    try {
      await updateProfile(userCredential.user, {
        displayName: normalizedUsername,
      });
    } catch (error) {
      const rolledBack = await rollbackRegistration(
        userCredential.user
      );

      if (!rolledBack) {
        const rollbackError = new Error(
          "Registration could not be completed, and the partially created account could not be removed. Please contact support or try signing in."
        );

        rollbackError.code =
          "auth/registration-rollback-failed";

        throw rollbackError;
      }

      const profileError = new Error(
        "Registration could not be completed because the username could not be saved. Please try again."
      );

      profileError.code = "auth/profile-setup-failed";

      throw profileError;
    }

    // Step 3: Create the Interview Buddy application profile
    // through the authenticated backend API.
    try {
      await createUserProfile(
        userCredential.user,
        normalizedUsername
      );
    } catch (error) {
      const rolledBack = await rollbackRegistration(
        userCredential.user
      );

      if (!rolledBack) {
        const rollbackError = new Error(
          "Registration could not be completed, and the partially created account could not be removed. Please contact support or try signing in."
        );

        rollbackError.code =
          "auth/registration-rollback-failed";

        throw rollbackError;
      }

      throw error;
    }

    const registeredUser = mapFirebaseUser(
      userCredential.user
    );

    // Step 4: Registration should not also count as login.
    try {
      await signOut(auth);
    } catch (error) {
      const signOutError = new Error(
        "Your account was created, but automatic sign-out failed. Please sign out before continuing."
      );

      signOutError.code =
        "auth/post-registration-signout-failed";

      throw signOutError;
    }

    return {
      created: true,
      user: registeredUser,
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

  subscribeToAuthState(callback) {
    if (typeof callback !== "function") {
      throw new Error(
        "Auth state callback is required."
      );
    }

    return onAuthStateChanged(auth, (user) => {
      callback(mapFirebaseUser(user));
    });
  },

  async changePassword(
    currentPassword,
    newPassword
  ) {
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