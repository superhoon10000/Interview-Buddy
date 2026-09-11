import mockUser from "../data/mockUser";

/**
 * React-facing authentication service facade.
 *
 * Sprint 1 keeps authentication simulated. React components should eventually
 * call this module instead of talking directly to Firebase/Auth providers.
 * A later backend implementation can replace these internals without changing
 * the component-facing method names.
 */
export const authService = {
  async login(credentials) {
    if (!credentials) {
      throw new Error("Login credentials are required.");
    }

    const identifier = credentials.username || credentials.email;

    if (!identifier || !credentials.password) {
      throw new Error("Username/email and password are required.");
    }

    // Sprint 1 mock behavior: any non-empty credentials authenticate.
    return {
      authenticated: true,
      user: {
        ...mockUser,
        username: identifier,
      },
    };
  },

  async register(userData) {
    if (!userData) {
      throw new Error("Registration data is required.");
    }

    const { username, email, password } = userData;

    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required.");
    }

    // Sprint 1 mock behavior only.
    return {
      created: true,
      user: {
        ...mockUser,
        username,
        email,
      },
    };
  },

  async logout() {
    // Future: invalidate the authenticated backend/Firebase session.
    return { success: true };
  },

  async changePassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error("Current and new passwords are required.");
    }

    if (currentPassword === newPassword) {
      throw new Error("New password cannot be the same as the current password.");
    }

    // Future: verify the current password and update it through auth/backend.
    return { success: true };
  },
};