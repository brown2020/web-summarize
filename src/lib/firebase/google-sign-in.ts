import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
} from "firebase/auth";
import { authCode } from "./auth-errors";

export async function signInWithGoogle(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (authCode(error) !== "auth/popup-blocked") throw error;
    await signInWithRedirect(auth, provider);
  }
}
