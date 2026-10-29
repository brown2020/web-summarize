import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type Auth, type Unsubscribe, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APPID,
};

export const hasClientConfig = Boolean(
  firebaseConfig.apiKey?.trim() &&
    firebaseConfig.authDomain?.trim() &&
    firebaseConfig.projectId?.trim() &&
    firebaseConfig.appId?.trim()
);

function createDeferredAuth(): Auth {
  const authStub = {
    get currentUser(): User | null {
      return null;
    },
    onAuthStateChanged(
      nextOrObserver: ((user: User | null) => void) | { next?: (user: User | null) => void }
    ): Unsubscribe {
      const next = typeof nextOrObserver === "function" ? nextOrObserver : nextOrObserver?.next;
      next?.(null);
      return () => {};
    },
  };
  return authStub as unknown as Auth;
}

let app: FirebaseApp | undefined;
let auth: Auth;

if (hasClientConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  auth = createDeferredAuth();
}

export function subscribeToAuth(next: (user: User | null) => void): Unsubscribe {
  if (!hasClientConfig) {
    next(null);
    return () => {};
  }
  return onAuthStateChanged(auth, next);
}

export async function getCurrentIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { app, auth };
