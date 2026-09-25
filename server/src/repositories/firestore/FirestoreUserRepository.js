const UserRepository = require("../contracts/UserRepository");

class FirestoreUserRepository extends UserRepository {
  constructor({ db, admin }) {
    super();

    if (!db) {
      throw new Error(
        "FirestoreUserRepository requires a Firestore db instance."
      );
    }

    this.db = db;
    this.admin = admin;
  }

  getTimestamp(fallbackValue) {
    return this.admin?.firestore?.FieldValue?.serverTimestamp
      ? this.admin.firestore.FieldValue.serverTimestamp()
      : fallbackValue || new Date().toISOString();
  }

  async createProfile({
    uid,
    username,
    email,
  }) {
    const normalizedUid = String(uid || "").trim();
    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "").trim();
    const usernameLower = normalizedUsername.toLowerCase();

    if (
      !normalizedUid ||
      !normalizedUsername ||
      !normalizedEmail
    ) {
      throw new Error(
        "uid, username, and email are required to create a user profile."
      );
    }

    const existingUser =
      await this.findByUsername(normalizedUsername);

    if (existingUser && existingUser.uid !== normalizedUid) {
      const error = new Error(
        "That username is already in use."
      );

      error.code = "username-already-exists";

      throw error;
    }

    const timestamp = this.getTimestamp();

    const profile = {
      uid: normalizedUid,
      username: normalizedUsername,
      usernameLower,
      email: normalizedEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.db
      .collection("users")
      .doc(normalizedUid)
      .set(profile);

    return profile;
  }

  async findById(userId) {
    const normalizedUserId = String(userId || "").trim();

    if (!normalizedUserId) {
      return null;
    }

    const document = await this.db
      .collection("users")
      .doc(normalizedUserId)
      .get();

    if (!document.exists) {
      return null;
    }

    return {
      id: document.id,
      ...document.data(),
    };
  }

  async findByUsername(username) {
    const normalizedUsername = String(
      username || ""
    )
      .trim()
      .toLowerCase();

    if (!normalizedUsername) {
      return null;
    }

    const snapshot = await this.db
      .collection("users")
      .where(
        "usernameLower",
        "==",
        normalizedUsername
      )
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      id: document.id,
      ...document.data(),
    };
  }
}

module.exports = FirestoreUserRepository;