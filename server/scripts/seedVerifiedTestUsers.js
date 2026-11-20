
"use strict";

/**
 * Create disposable, email-verified Interview Buddy test accounts.
 *
 * By default, the script generates five accounts with randomized usernames,
 * email addresses, and secure passwords. Optional --username and --email
 * arguments allow creation of a single customized test account instead.
 * If only one custom field is provided, the other is generated automatically.
 *
 * Run from server/:
 *
 *   // Preview five generated accounts (no changes made)
 *   node scripts/seedVerifiedTestUsers.js --project=PROJECT_ID --live
 *
 *   // Create five generated accounts
 *   node scripts/seedVerifiedTestUsers.js --project=PROJECT_ID --live --apply
 *
 *   // Preview a custom account
 *   node scripts/seedVerifiedTestUsers.js --project=PROJECT_ID --live --username=DemoUser --email=demo@example.test
 *
 *   // Create a custom account
 *   node scripts/seedVerifiedTestUsers.js --project=PROJECT_ID --live --apply --username=DemoUser --email=demo@example.test
 *
 * Safety and configuration:
 * - Without --apply, the script performs a dry run and makes no changes.
 * - --live targets the configured Firebase project.
 * - For local emulators, configure BOTH FIREBASE_AUTH_EMULATOR_HOST and
 *   FIRESTORE_EMULATOR_HOST, then use --emulator instead of --live.
 * - Created users are marked email-verified and receive standard user
 *   privileges in Firebase Authentication and Firestore.
 * - Generated passwords and account details are saved to a Markdown file
 *   in server/scripts/output/, which is excluded by .gitignore.
 * - Never commit or publicly share generated credentials.
 */

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ACCOUNT_COUNT = 5;

//Adds arguements for custom username / emails (facilitate presentation test accounts)
//Preserves existing safety checks
function parseArgs(argv) {
  if (argv.includes("--help")) return { help: true };

  const projectArg = argv.find((arg) => arg.startsWith("--project="));
  const usernameArg = argv.find((arg) => arg.startsWith("--username="));
  const emailArg = argv.find((arg) => arg.startsWith("--email="));

  const project = projectArg ? projectArg.slice("--project=".length).trim() : "";
  const username = usernameArg ? usernameArg.slice("--username=".length).trim() : "";
  const email = emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : "";

  const apply = argv.includes("--apply");
  const live = argv.includes("--live");
  const emulator = argv.includes("--emulator");

  const allowed = new Set(["--apply", "--live", "--emulator"]);

  if (projectArg) allowed.add(projectArg);
  if (usernameArg) allowed.add(usernameArg);
  if (emailArg) allowed.add(emailArg);

  const unexpected = argv.filter((arg) => !allowed.has(arg));

  if (!project || unexpected.length || live === emulator) {
    throw new Error(
      "Usage: node scripts/seedVerifiedTestUsers.js " +
      "--project=PROJECT_ID (--live | --emulator) [--apply] " +
      "[--username=NAME] [--email=EMAIL]"
    );
  }

  if (usernameArg && !/^[A-Za-z0-9_-]{2,64}$/.test(username)) {
    throw new Error(
      "--username must be 2-64 letters, numbers, underscores, or hyphens."
    );
  }

  if (
    emailArg &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    throw new Error("--email must be a valid email address.");
  }

  if (project !== process.env.FIREBASE_PROJECT_ID) {
    throw new Error(
      `Project mismatch: --project=${project}, ` +
      `FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID || "(unset)"}.`
    );
  }

  const authEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const firestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (authEmulator !== firestoreEmulator) {
    throw new Error(
      "Refusing mixed environments. Set BOTH Firebase Auth and " +
      "Firestore emulator hosts, or unset BOTH."
    );
  }

  if (live && authEmulator) {
    throw new Error(
      "--live cannot be used while Firebase emulators are configured."
    );
  }

  if (emulator && !authEmulator) {
    throw new Error(
      "--emulator requires FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST."
    );
  }

  return { project, apply, live, emulator, username, email };
}


function makeAccounts(options) {
  const uniqueTag = crypto.randomBytes(5).toString("hex");

  const makeAccount = (username, email) => ({
    username,
    email,
    password: `IB!${crypto.randomBytes(20).toString("base64url")}9aA`,
  });

  if (options.username || options.email) {
    const username = options.username || `IBTest01_${uniqueTag}`;
    const email = options.email || `${username.toLowerCase()}@example.test`;

    return [makeAccount(username, email)];
  }

  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const username = `IBTest${number}_${uniqueTag}`;

    return makeAccount(
      username,
      `${username.toLowerCase()}@example.test`
    );
  });
}

function makeReport(project, target, outputFile) {
  fs.mkdirSync(path.dirname(outputFile), {
    recursive: true,
    mode: 0o700,
  });

  const heading = [
    "# Interview Buddy - Verified Test Accounts",
    "",
    "**SENSITIVE: Contains working passwords. Do not commit, share publicly, or email.**",
    "",
    `- Firebase project: \`${project}\``,
    `- Target: ${target}`,
    `- Created (UTC): ${new Date().toISOString()}`,
    "- Auto-generated email addresses use the reserved `.test` domain and have no mailbox; custom emails are used as supplied.",
    "- These accounts are administratively marked verified for testing only.",
    "- All accounts have standard `user` privileges.",
    "",
    "| Username | Email | Password | Firebase UID | Verified | Role |",
    "| --- | --- | --- | --- | --- | --- |",
  ].join("\n") + "\n";

  fs.writeFileSync(outputFile, heading, {
    flag: "wx",
    mode: 0o600,
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(
      "Usage: node scripts/seedVerifiedTestUsers.js " +
      "--project=PROJECT_ID (--live | --emulator) [--apply] " +
      "[--username=NAME] [--email=EMAIL]"
    );
    return;
  }

  const target = options.live
    ? "LIVE FIREBASE"
    : "FIREBASE EMULATORS";

  console.log(`Firebase project: ${options.project}`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${options.apply ? "APPLY" : "DRY RUN"}`);
  const accountCount = options.username || options.email ? 1 : ACCOUNT_COUNT;
  console.log(`Accounts to create: ${accountCount}`);

  if (!options.apply) {
    console.log("No changes made and no passwords generated.");
    console.log(
      `Add --apply to create ${accountCount} new account(s) and their Markdown file.`
    );
    return;
  }

  const { admin, db } = require("../src/firebaseAdmin");

  const FirestoreUserRepository = require(
    "../src/repositories/firestore/FirestoreUserRepository"
  );

  const { DEFAULT_USER_ROLE } = require("../src/config/roles");

  const repository = new FirestoreUserRepository({
    db,
    admin,
  });

  const auth = admin.auth();
  const accounts = makeAccounts(options);

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const outputFile = path.join(
    __dirname,
    "output",
    `verified-test-users-${stamp}.md`
  );

  makeReport(options.project, target, outputFile);

  let successful = 0;

  console.log(`Private credentials file: ${outputFile}`);

  for (const account of accounts) {
    let createdUser;

    try {
      // Create Firebase Authentication account.
      createdUser = await auth.createUser({
        email: account.email,
        password: account.password,
        displayName: account.username,
        emailVerified: true,
        disabled: false,
      });

      // Assign default user role.
      await auth.setCustomUserClaims(createdUser.uid, {
        role: DEFAULT_USER_ROLE,
      });

      // Create Firestore profile and reserve unique username.
      const profile = await repository.createProfile({
        uid: createdUser.uid,
        username: account.username,
        email: account.email,
      });

      // Validate profile creation.
      if (
        profile.uid !== createdUser.uid ||
        profile.role !== DEFAULT_USER_ROLE
      ) {
        throw new Error(
          "Created profile failed validation."
        );
      }

      // Save account credentials to Markdown.
      fs.appendFileSync(
        outputFile,
        `| ${account.username} | ${account.email} | ` +
          `\`${account.password}\` | \`${createdUser.uid}\` | Yes | ` +
          `${DEFAULT_USER_ROLE} |\n`,
        { encoding: "utf8" }
      );

      successful += 1;

      console.log(
        `CREATED ${successful}/${accountCount}: ${account.email}`
      );

    } catch (error) {
      // Roll back Authentication if the Firestore profile
      // was not successfully created.
      if (createdUser) {
        try {
          const storedProfile = await db
            .collection("users")
            .doc(createdUser.uid)
            .get();

          if (!storedProfile.exists) {
            await auth.deleteUser(createdUser.uid);

            console.error(
              `Rolled back incomplete Auth user ${createdUser.uid}.`
            );
          } else {
            console.error(
              `Partial account retained for inspection: UID ${createdUser.uid}.`
            );
          }

        } catch (rollbackError) {
          console.error(
            `Rollback check failed for UID ${createdUser.uid}: ${rollbackError.message}`
          );
        }
      }

      console.error(
        `FAILED on ${account.email}: ${error.message}`
      );

      console.error(
        `Successful credentials already saved: ${outputFile}`
      );

      throw error;
    }
  }

  // Write final account creation summary.
  fs.appendFileSync(
    outputFile,
    `\n**Created successfully: ${successful}/${accountCount}**\n`
  );

  console.log(
    `Done: ${successful} verified users created in Auth + Firestore.`
  );

  console.log(`Credentials: ${outputFile}`);

  console.log(
    "Keep the Markdown file private; it contains plaintext passwords."
  );
}

run().catch((error) => {
  console.error(
    `Test-user seeding failed: ${error.message || error}`
  );

  process.exitCode = 1;
});
