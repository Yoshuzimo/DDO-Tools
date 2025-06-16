// IMPORTANT: dotenv configuration should be as early as possible
import dotenv from "dotenv";
import path from "path";
import fs from "fs"; // Import the File System module

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const dotenvResult = dotenv.config({ path: envPath });
  if (dotenvResult.error) {
    console.error(
      `[setAdminClaim.ts] CRITICAL: Error loading .env.local file from ${envPath}. Error: ${dotenvResult.error.message}`
    );
  } else {
    // console.log(`[setAdminClaim.ts] Successfully loaded environment variables from ${envPath}.`);
  }
} else {
  // console.warn(`[setAdminClaim.ts] Note: .env.local file not found at ${envPath}. Will rely on globally set environment variables or other credential methods.`);
}

import * as admin from "firebase-admin";
import { program } from "commander";

// --- !!! ATTENTION: MANUAL CONFIGURATION FOR LOCAL SCRIPT USE !!! ---
// If you are having trouble with the GOOGLE_APPLICATION_CREDENTIALS environment variable,
// AND you cannot set it in .env.local, you can specify the FULL ABSOLUTE PATH to your
// downloaded service account JSON key file here as a last resort.
// Example Windows: const manualServiceAccountPath = "C:\\Users\\YourName\\firebase-keys\\my-service-account.json";
//
// ** IMPORTANT SECURITY NOTE: **
// Do NOT commit this file to a public repository if you hardcode a path here.
// This is intended for local development and one-off script execution.
// The PREFERRED method is to use the GOOGLE_APPLICATION_CREDENTIALS environment variable (ideally set in .env.local).

const manualServiceAccountPath = ""; // Intentionally left blank unless explicitly needed by user

console.log(
  `[setAdminClaim.ts] Value of process.env.GOOGLE_APPLICATION_CREDENTIALS as seen by script: ${
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set"
  }`
);
console.log(
  `[setAdminClaim.ts] Value of process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as seen by script: ${
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Not Set"
  }`
);
console.log(
  `[setAdminClaim.ts] Value of process.env.GCLOUD_PROJECT as seen by script: ${
    process.env.GCLOUD_PROJECT || "Not Set"
  }`
);
console.log(
  `[setAdminClaim.ts] Value of process.env.GOOGLE_CLOUD_PROJECT as seen by script: ${
    process.env.GOOGLE_CLOUD_PROJECT || "Not Set"
  }`
);
console.log(
  `[setAdminClaim.ts] Value of process.env.FIREBASE_AUTH_EMULATOR_HOST as seen by script: ${
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "Not Set"
  }`
);

if (
  manualServiceAccountPath &&
  manualServiceAccountPath.trim() !== "" &&
  manualServiceAccountPath !==
    "PASTE_YOUR_FULL_ABSOLUTE_PATH_TO_SERVICE_ACCOUNT_KEY_HERE.json"
) {
  console.log(
    `[setAdminClaim.ts] Manual service account path configured in script (will be used as fallback): ${manualServiceAccountPath}`
  );
}

try {
  if (admin.apps.length === 0) {
    const adminConfig: admin.AppOptions = {};
    let serviceAccountJsonContent: any;
    let gaePath: string | undefined =
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let usedCredentialSource = "";

    if (gaePath) {
      console.log(
        `[setAdminClaim.ts] Attempting to use GOOGLE_APPLICATION_CREDENTIALS path: ${gaePath}`
      );
      if (fs.existsSync(gaePath)) {
        try {
          const rawJson = fs.readFileSync(gaePath, "utf8");
          serviceAccountJsonContent = JSON.parse(rawJson);
          adminConfig.credential = admin.credential.cert(
            serviceAccountJsonContent
          );
          console.log(
            `[setAdminClaim.ts] Successfully using service account key via GOOGLE_APPLICATION_CREDENTIALS: ${gaePath}`
          );
          usedCredentialSource =
            "GOOGLE_APPLICATION_CREDENTIALS from .env.local or shell";
        } catch (e: any) {
          console.error(
            `\n[setAdminClaim.ts] ERROR: Failed to load or parse service account key from GOOGLE_APPLICATION_CREDENTIALS path (${gaePath}). Error: ${e.message}`
          );
          gaePath = undefined; // Invalidate gaePath so manual path can be tried
        }
      } else {
        console.warn(
          `\n[setAdminClaim.ts] WARNING: GOOGLE_APPLICATION_CREDENTIALS is set to '${gaePath}', but file NOT FOUND. Will check manual path if configured.`
        );
        gaePath = undefined;
      }
    }

    if (
      !adminConfig.credential &&
      manualServiceAccountPath &&
      manualServiceAccountPath.trim() !== "" &&
      manualServiceAccountPath !==
        "PASTE_YOUR_FULL_ABSOLUTE_PATH_TO_SERVICE_ACCOUNT_KEY_HERE.json"
    ) {
      console.log(
        `[setAdminClaim.ts] GOOGLE_APPLICATION_CREDENTIALS not used or file not found. Attempting manual path: ${manualServiceAccountPath}`
      );
      if (fs.existsSync(manualServiceAccountPath)) {
        try {
          const rawJson = fs.readFileSync(manualServiceAccountPath, "utf8");
          serviceAccountJsonContent = JSON.parse(rawJson);
          adminConfig.credential = admin.credential.cert(
            serviceAccountJsonContent
          );
          console.log(
            `[setAdminClaim.ts] Successfully using service account key directly from manual path: ${manualServiceAccountPath}`
          );
          usedCredentialSource = "manualServiceAccountPath variable in script";
        } catch (e: any) {
          console.error(
            `\n[setAdminClaim.ts] ERROR: Failed to load or parse service account key from manual path (${manualServiceAccountPath}). Error: ${e.message}`
          );
        }
      } else {
        console.error(
          `\n[setAdminClaim.ts] ERROR: Manual service account path specified, but file NOT FOUND at: ${manualServiceAccountPath}`
        );
      }
    }

    const projectIdFromEnv =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT;

    if (projectIdFromEnv) {
      adminConfig.projectId = projectIdFromEnv;
      console.log(
        `[setAdminClaim.ts] Using Project ID from environment variable: ${adminConfig.projectId}`
      );
    } else if (
      serviceAccountJsonContent &&
      serviceAccountJsonContent.project_id
    ) {
      adminConfig.projectId = serviceAccountJsonContent.project_id;
      console.log(
        `[setAdminClaim.ts] Using Project ID from loaded service account key: ${adminConfig.projectId}`
      );
    }

    if (!adminConfig.credential) {
      console.error(
        "\n[setAdminClaim.ts] CRITICAL: Could not initialize Firebase Admin SDK credentials."
      );
      console.log(
        "Please ensure that a valid service account key JSON file is accessible."
      );
      console.log("Recommended methods (highest priority first):");
      console.log(
        "  1. Set GOOGLE_APPLICATION_CREDENTIALS in your .env.local file (in the project root) to the FULL ABSOLUTE PATH of your key file."
      );
      console.log(
        '     Example: GOOGLE_APPLICATION_CREDENTIALS="C:/path/to/your/service-account-key.json"'
      );
      console.log(
        "     Current value loaded by script (from .env.local or shell): " +
          (process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            "Not Set or Not Visible to Script")
      );
      console.log(
        "  2. OR, set the GOOGLE_APPLICATION_CREDENTIALS environment variable in your terminal session before running this script."
      );
      console.log(
        "  3. OR, as a last resort for local testing, edit the 'manualServiceAccountPath' variable at the top of this script with the full absolute path."
      );
      console.log(
        "     Current manual path variable value (should be empty or your path): " +
          manualServiceAccountPath
      );
      console.log(
        "\nEnsure the key file exists, is readable, and is a valid JSON service account key from Firebase that contains a 'project_id'."
      );
      process.exit(1);
    }
    if (!adminConfig.projectId) {
      console.warn(
        "[setAdminClaim.ts] Project ID not found in environment variables or service account key. SDK will attempt auto-discovery from credentials which might fail locally if key is not rich enough or if GOOGLE_APPLICATION_CREDENTIALS is not set."
      );
    }

    admin.initializeApp(adminConfig);
    console.log("Firebase Admin SDK initialized.");
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      console.log(
        `[setAdminClaim.ts] Detected FIREBASE_AUTH_EMULATOR_HOST=${process.env.FIREBASE_AUTH_EMULATOR_HOST}. Script will target the Auth Emulator.`
      );
    } else {
      console.log(
        "[setAdminClaim.ts] FIREBASE_AUTH_EMULATOR_HOST is not set. Script will target LIVE Firebase Auth services."
      );
    }
  } else {
    // console.log("Firebase Admin SDK was already initialized.");
  }
} catch (error: any) {
  console.error("Error during Firebase Admin SDK setup:", error.message);
  console.log(
    "\nPlease ensure your Firebase project setup and service account key are correct."
  );
  process.exit(1);
}

program
  .version("1.0.0")
  .description("Set custom admin claim for a Firebase user.")
  .requiredOption(
    "-u, --uid <uid>",
    "User ID (UID) of the user to set admin claim for."
  )
  .parse(process.argv);

const options = program.opts();

async function setAdminClaimForUser(uid: string) {
  if (!uid || typeof uid !== "string" || uid.trim() === "") {
    console.error(
      "Error: A valid User ID (UID) must be provided using the --uid option."
    );
    program.help();
    process.exit(1);
  }

  console.log("Attempting to set admin claim for UID: " + uid);

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(
      "\nSuccessfully set { admin: true } custom claim for user: " + uid
    );

    const userRecord = await admin.auth().getUser(uid);
    console.log(
      "Fetched user record. Current custom claims:",
      userRecord.customClaims
    );

    console.log(
      "\nImportant: The user may need to sign out and sign back in, or wait for their ID token to refresh (up to an hour) for the new claim to be reflected on the client-side."
    );
    process.exit(0);
  } catch (error: any) {
    console.error(
      "\nError setting custom claims for UID: " + uid,
      error.message
    );
    if (error.code === "auth/user-not-found") {
      console.error(
        "The provided UID does not correspond to an existing user."
      );
      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        console.error(
          `Suggestion: Ensure the user with UID '${uid}' exists in the Firebase Auth Emulator (check Emulator UI at http://${
            process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:4000"
          }).`
        );
      } else {
        console.error(
          `Suggestion: Ensure the user with UID '${uid}' exists in your LIVE Firebase project (check Firebase Console).`
        );
      }
    } else if (
      error.code === "auth/internal-error" &&
      error.message.includes("PERMISSION_DENIED")
    ) {
      console.error(
        "------------------------------------------------------------------------------------"
      );
      console.error(
        "PERMISSION DENIED: The authenticated service account does not have sufficient permissions."
      );
      console.error(
        "To set custom user claims, the service account typically needs the 'Firebase Authentication Admin' (roles/firebaseauth.admin) IAM role, and possibly 'Service Usage Consumer' (roles/serviceusage.serviceUsageConsumer)."
      );
      console.error(
        `Please go to the Google Cloud Console (IAM & Admin > IAM) for your project '${
          admin.app().options.projectId || "your-project-id"
        }' and ensure the service account has these roles.`
      );
      const clientEmail =
        admin.app().options.credential &&
        (
          admin.app().options
            .credential as admin.credential.ServiceAccountCredential
        ).clientEmail;
      console.error(
        "The service account principal is likely: " +
          (clientEmail ||
            "your-service-account@your-project-id.iam.gserviceaccount.com")
      );
      console.error(
        "You can manage service account roles in the Google Cloud Console under IAM & Admin > IAM."
      );
      console.error(
        "Relevant error details:",
        error.errorInfo || error.code,
        error.message
      );
      console.error(
        "------------------------------------------------------------------------------------"
      );
    } else if (
      error.message &&
      (error.message.includes("Failed to determine project ID") ||
        error.message.includes("Could not load the default credentials"))
    ) {
      console.error(
        "------------------------------------------------------------------------------------"
      );
      console.error(
        "The Admin SDK could not determine the Firebase Project ID or load default credentials."
      );
      console.error(
        "This usually means the service account key is not being found or used correctly."
      );
      console.error("Please ensure that either:");
      console.error(
        "  1. The GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly (e.g., in your .env.local or shell) to a valid service account JSON file (which includes the project_id)."
      );
      console.error(
        "     Current value seen by script: " +
          (process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set")
      );
      console.error(
        "  2. The NEXT_PUBLIC_FIREBASE_PROJECT_ID (or GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT) environment variable is set to your Firebase Project ID."
      );
      console.error(
        "     Current NEXT_PUBLIC_FIREBASE_PROJECT_ID in script: " +
          (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Not Set")
      );
      console.error(
        "  3. OR, if you used it, the 'manualServiceAccountPath' variable in this script is set to a valid path, AND that key file includes a 'project_id'."
      );
      console.error(
        "  4. You are running this script in a Google Cloud environment where the Project ID can be auto-discovered."
      );
      console.error(
        "You can find your Project ID in the Firebase Console Project Settings."
      );
      console.error(
        "------------------------------------------------------------------------------------"
      );
    } else if (
      error.message &&
      (error.message.includes("Error fetching access token") ||
        error.message.includes("invalid_grant"))
    ) {
      console.error(
        "------------------------------------------------------------------------------------"
      );
      console.error(
        "Failed to fetch an access token. This often means the Admin SDK could not properly authenticate using the provided credentials (GOOGLE_APPLICATION_CREDENTIALS or manual path)."
      );
      console.error(
        "  - Verify the credential source (environment variable or manual path in script) points to the correct, valid, and readable service account key JSON file."
      );
      console.error(
        "  - Ensure the service account is enabled and has not been deleted or disabled."
      );
      console.error(
        "  - Check for network connectivity issues that might prevent communication with Google's auth servers."
      );
      console.error(
        "  - The service account key might be invalid, malformed, or the system time on your machine might be too skewed."
      );
      console.error(
        "------------------------------------------------------------------------------------"
      );
    }
    process.exit(1);
  }
}

const uidToMakeAdmin = options.uid;

if (uidToMakeAdmin) {
  setAdminClaimForUser(uidToMakeAdmin);
} else {
  console.error("Error: User ID (UID) is required.");
  program.help();
  process.exit(1);
}
