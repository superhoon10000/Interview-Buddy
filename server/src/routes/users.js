const express = require("express");

/**
 * User/profile application routes.
 *
 * req.user is expected to be populated by Firebase authentication
 * middleware before these routes are mounted.
 */
function createUserRouter({ userRepository }) {
  if (!userRepository) {
    throw new Error(
      "createUserRouter requires userRepository."
    );
  }

  const router = express.Router();

  // POST /api/users/profile
  //
  // Creates the application profile associated with the
  // authenticated Firebase user.
  //
  // Body:
  // {
  //   username: "exampleUser"
  // }
  router.post("/profile", async (req, res, next) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({
          error: "Authentication is required.",
        });
      }

      const username = String(
        req.body?.username || ""
      ).trim();

      if (!username) {
        return res.status(400).json({
          error: "Username is required.",
        });
      }

      const existingUser =
        await userRepository.findByUsername(username);

      if (
        existingUser &&
        existingUser.uid !== req.user.uid
      ) {
        return res.status(409).json({
          error: "That username is already in use.",
          code: "username-already-exists",
        });
      }

      const profile =
        await userRepository.createProfile({
          uid: req.user.uid,
          username,
          email: req.user.email || "",
        });

      return res.status(201).json({
        profile,
      });
    } catch (error) {
      if (error.code === "username-already-exists") {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }

      return next(error);
    }
  });

  return router;
}

module.exports = createUserRouter;