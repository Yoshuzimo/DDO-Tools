import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  type FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";
import { firebaseConfig } from "@/config/firebaseClient";

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let storageInstance: FirebaseStorage | undefined = undefined;

let clientEmulatorsConnectedLog = false;

console.log(
  "[CLIENT FIREBASE] Top of firebase.ts. typeof window:",
  typeof window
); // Debug

if (typeof window !== "undefined") {
  console.log(
    "[CLIENT FIREBASE] Code block for window !== undefined is executing."
  ); // Debug
  if (getApps().length === 0) {
    console.log(
      "[CLIENT FIREBASE] No Firebase apps initialized yet. Attempting initialization."
    ); // Debug
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
      try {
        app = initializeApp(firebaseConfig);
        console.log(
          "[CLIENT FIREBASE] Firebase app initialized successfully on client. App ID:",
          app.name
        ); // Initialization log
        authInstance = initializeAuth(app, {
          persistence: browserLocalPersistence,
        });
        console.log("[CLIENT FIREBASE] Auth instance initialized."); // Debug
        dbInstance = getFirestore(app);
        console.log("[CLIENT FIREBASE] Firestore instance initialized."); // Debug
        storageInstance = getStorage(app);
        console.log("[CLIENT FIREBASE] Storage instance initialized."); // Debug
      } catch (e: any) {
        console.error(
          "[CLIENT FIREBASE CRITICAL] Failed to initialize Firebase app on client. Check config and network. Error:",
          e.message,
          e
        );
      }
    } else {
      console.error(
        "[CLIENT FIREBASE CRITICAL] Firebase configuration (apiKey or projectId) is missing or invalid for client. " +
          "Ensure NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase settings are correctly set in .env.local. " +
          "Client-side Firebase SDK will not be properly initialized."
      );
    }
  } else {
    app = getApp();
    console.log(
      "[CLIENT FIREBASE] Using existing default Firebase app instance on client. App ID:",
      app.name
    ); // Initialization log
    try {
      authInstance = getAuth(app);
      console.log("[CLIENT FIREBASE] Existing Auth instance obtained."); // Debug
      dbInstance = getFirestore(app);
      console.log("[CLIENT FIREBASE] Existing Firestore instance obtained."); // Debug
      storageInstance = getStorage(app);
      console.log("[CLIENT FIREBASE] Existing Storage instance obtained."); // Debug
    } catch (e: any) {
      console.error(
        "[CLIENT FIREBASE CRITICAL] Failed to get Auth, Firestore, or Storage from existing client app instance:",
        e.message,
        e
      );
    }
  }

  if (process.env.NODE_ENV === "development" && !clientEmulatorsConnectedLog) {
    console.log(
      "[CLIENT FIREBASE] Development mode detected. Attempting to connect to emulators."
    ); // Debug
    let connectedToAtLeastOneEmulator = false;
    if (authInstance) {
      try {
        connectAuthEmulator(authInstance, "http://localhost:9099", {
          disableWarnings: true,
        });
        console.log(
          "[CLIENT FIREBASE] Client Auth SDK connected to local emulator on port 9099."
        ); // Emulator log
        connectedToAtLeastOneEmulator = true;
      } catch (e: any) {
        if (
          e.code === "auth/emulator-config-failed" &&
          e.message.includes("already connected")
        ) {
          console.warn(
            "[CLIENT FIREBASE] Client Auth already connected to emulator. Skipping redundant connection attempt."
          ); // Emulator log
          connectedToAtLeastOneEmulator = true;
        } else {
          console.error(
            `[CLIENT FIREBASE] Error connecting client Auth to emulator: ${e.message}`
          );
        }
      }
    } else {
      console.error(
        "[CLIENT FIREBASE] Client Auth service NOT available. Emulator NOT connected for Auth."
      );
    }

    if (dbInstance) {
      try {
        connectFirestoreEmulator(dbInstance, "localhost", 8080);
        console.log(
          "[CLIENT FIREBASE] Client Firestore SDK connected to local emulator on port 8080."
        ); // Emulator log
        connectedToAtLeastOneEmulator = true;
      } catch (e: any) {
        console.error(
          `[CLIENT FIREBASE] Error connecting client Firestore to emulator: ${e.message}`
        );
      }
    } else {
      console.error(
        "[CLIENT FIREBASE] Client Firestore service NOT available. Emulator NOT connected for Firestore."
      );
    }

    if (storageInstance) {
      try {
        connectStorageEmulator(storageInstance, "localhost", 9199);
        console.log(
          "[CLIENT FIREBASE] Client Storage SDK connected to local emulator on port 9199."
        ); // Emulator log
        connectedToAtLeastOneEmulator = true;
      } catch (e: any) {
        console.error(
          `[CLIENT FIREBASE] Error connecting client Storage to emulator: ${e.message}`
        );
      }
    } else {
      console.error(
        "[CLIENT FIREBASE] Client Storage service NOT available. Emulator NOT connected for Storage."
      );
    }

    if (
      connectedToAtLeastOneEmulator ||
      !authInstance ||
      !dbInstance ||
      !storageInstance
    ) {
      clientEmulatorsConnectedLog = true;
      console.log(
        "[CLIENT FIREBASE] Emulator connection process completed. clientEmulatorsConnectedLog set to true."
      ); // Debug
    }
  } else {
    console.log(
      "[CLIENT FIREBASE] Not in development mode or emulators already logged as connected. Skipping emulator connection block."
    ); // Debug
  }
} else {
  console.log(
    "[CLIENT FIREBASE] Code block for window === undefined (server-side context) is executing. No client Firebase setup here."
  ); // Debug
}

export {
  app,
  authInstance as auth,
  dbInstance as db,
  storageInstance as storage,
};
