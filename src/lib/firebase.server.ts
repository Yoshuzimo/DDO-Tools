// src/lib/firebase.server.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

let defaultAppServerEmulatorsConnectedLog = false;

console.log("[FIREBASE SERVER] Initializing server-side Firebase module."); // Debug

if (getApps().length === 0) {
  console.log("[FIREBASE SERVER] No Firebase apps initialized on server yet."); // Debug
  if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      "[FIREBASE SERVER CRITICAL] Firebase configuration (apiKey or projectId) is missing or invalid for default app. " +
        "Ensure NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase settings are correctly set. " +
        "Server-side Firebase SDK will not be properly initialized."
    );
    app = initializeApp(firebaseConfig || {});
    console.log(
      "[FIREBASE SERVER] Attempted to initialize default Firebase app on server with potentially incomplete config."
    ); // Debug
  } else {
    app = initializeApp(firebaseConfig);
    console.log(
      "[FIREBASE SERVER] Default Firebase app initialized on server. App Name:",
      app.name
    ); // Initialization log
  }
} else {
  app = getApp();
  console.log(
    "[FIREBASE SERVER] Using existing default Firebase app instance on server. App Name:",
    app.name
  ); // Initialization log
}

try {
  auth = getAuth(app);
  console.log("[FIREBASE SERVER] Server Auth service instance obtained."); // Debug
} catch (e: any) {
  console.error(
    "[FIREBASE SERVER CRITICAL] Failed to get Auth from server app instance:",
    e.message,
    e
  );
  // @ts-ignore
  auth = auth || undefined;
}

try {
  db = getFirestore(app);
  console.log("[FIREBASE SERVER] Server Firestore service instance obtained."); // Debug
} catch (e: any) {
  console.error(
    "[FIREBASE SERVER CRITICAL] Failed to get Firestore from server app instance:",
    e.message,
    e
  );
  // @ts-ignore
  db = db || undefined;
}

try {
  storage = getStorage(app);
  console.log("[FIREBASE SERVER] Server Storage service instance obtained."); // Debug
} catch (e: any) {
  console.error(
    "[FIREBASE SERVER CRITICAL] Failed to get Storage from server app instance:",
    e.message,
    e
  );
  // @ts-ignore
  storage = storage || undefined;
}

if (
  process.env.NODE_ENV === "development" &&
  !defaultAppServerEmulatorsConnectedLog
) {
  console.log(
    "[FIREBASE SERVER] Development mode. Attempting to connect server services to emulators."
  ); // Debug
  let connectedServerAuth = false;
  let connectedServerFirestore = false;
  let connectedServerStorage = false;

  if (auth) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", {
        disableWarnings: true,
      });
      console.log(
        "[FIREBASE SERVER] Server Auth (default app instance) connected to local emulator on port 9099."
      ); // Emulator log
      connectedServerAuth = true;
    } catch (e: any) {
      if (
        e.code === "auth/emulator-config-failed" &&
        e.message.includes("already connected")
      ) {
        console.warn(
          "[FIREBASE SERVER] Server Auth (default app) already connected to emulator. Skipping redundant connection attempt."
        ); // Emulator log
        connectedServerAuth = true;
      } else {
        console.error(
          `[FIREBASE SERVER] Error connecting server Auth (default app) to emulator: ${e.message}`
        );
      }
    }
  } else {
    console.error(
      "[FIREBASE SERVER] Server Auth service NOT available. Emulator NOT connected for Auth."
    );
  }

  if (db) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
      console.log(
        "[FIREBASE SERVER] Server Firestore (default app instance) connected to local emulator on port 8080."
      ); // Emulator log
      connectedServerFirestore = true;
    } catch (e: any) {
      console.error(
        `[FIREBASE SERVER] Error connecting server Firestore (default app) to emulator: ${e.message}`
      );
    }
  } else {
    console.error(
      "[FIREBASE SERVER] Server Firestore service NOT available. Emulator NOT connected for Firestore."
    );
  }

  if (storage) {
    try {
      connectStorageEmulator(storage, "localhost", 9199);
      console.log(
        "[FIREBASE SERVER] Server Storage (default app instance) connected to local emulator on port 9199."
      ); // Emulator log
      connectedServerStorage = true;
    } catch (e: any) {
      console.error(
        `[FIREBASE SERVER] Error connecting server Storage (default app) to emulator: ${e.message}`
      );
    }
  } else {
    console.error(
      "[FIREBASE SERVER] Server Storage service NOT available. Emulator NOT connected for Storage."
    );
  }

  if (
    connectedServerAuth ||
    connectedServerFirestore ||
    connectedServerStorage ||
    !auth ||
    !db ||
    !storage
  ) {
    defaultAppServerEmulatorsConnectedLog = true;
    console.log(
      "[FIREBASE SERVER] Server emulator connection process complete. defaultAppServerEmulatorsConnectedLog set to true."
    ); // Debug
  }
} else {
  console.log(
    "[FIREBASE SERVER] Not in development mode or server emulators already logged as connected."
  ); // Debug
}

export { app, auth, db, storage };
