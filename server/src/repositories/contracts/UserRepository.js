/**
 * Data-access contract for Interview Buddy user profiles.
 *
 * Authentication credentials remain in Firebase Authentication.
 * Application profile data such as username is persisted separately.
 */
class UserRepository {
  constructor() {
    if (new.target === UserRepository) {
      throw new Error(
        "UserRepository is an interface and cannot be instantiated directly."
      );
    }
  }

  async createProfile(profile) {
    throw new Error("createProfile() must be implemented.");
  }

  async findById(userId) {
    throw new Error("findById() must be implemented.");
  }

  async findByUsername(username) {
    throw new Error("findByUsername() must be implemented.");
  }
}

module.exports = UserRepository;