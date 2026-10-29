"use client";

import { FormEvent, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, hasClientConfig } from "@/lib/firebase/client";

export const EMAIL_LINK_STORAGE_KEY = "webSummarizeEmail";

type Mode = "signin" | "signup" | "link";

function authCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "unknown";
}

function authMessage(error: unknown): string {
  switch (authCode(error)) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for that email. Sign in instead.";
    case "auth/weak-password":
      return "Use a password of at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/user-disabled":
      return "This account is disabled.";
    default:
      return "Sign-in failed. Try again.";
  }
}

export function SignInForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!hasClientConfig) {
      setError("Sign-in is not configured yet.");
      return;
    }

    const address = email.trim();
    setPending(true);
    try {
      if (mode === "link") {
        await sendSignInLinkToEmail(auth, address, {
          url: `${window.location.origin}/loginfinish`,
          handleCodeInApp: true,
        });
        window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, address);
        setMessage("Check your email for a sign-in link.");
        return;
      }
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, address, password);
        return;
      }
      await signInWithEmailAndPassword(auth, address, password);
    } catch (caught) {
      console.error(`Sign-in failed: ${authCode(caught)}`);
      setError(authMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function sendReset() {
    setError(null);
    setMessage(null);
    if (!hasClientConfig) {
      setError("Sign-in is not configured yet.");
      return;
    }
    const address = email.trim();
    if (!address) {
      setError("Enter your email first.");
      return;
    }
    setPending(true);
    try {
      await sendPasswordResetEmail(auth, address);
      setMessage("Password reset email sent.");
    } catch (caught) {
      console.error(`Password reset failed: ${authCode(caught)}`);
      setError(authMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {mode !== "link" ? (
        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          We will email you a one-time link. Open it on this device.
        </p>
      )}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !hasClientConfig}>
        {mode === "signup" ? "Create account" : mode === "link" ? "Email me a link" : "Sign in"}
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signup" ? "Have an account? Sign in" : "Create an account"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setMode(mode === "link" ? "signin" : "link");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "link" ? "Use a password" : "Email me a sign-in link"}
        </Button>
        {mode === "signin" ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => void sendReset()}>
            Forgot password
          </Button>
        ) : null}
      </div>
      {!hasClientConfig ? (
        <p className="text-xs text-muted-foreground">
          Firebase client settings are not set, so sign-in cannot start.
        </p>
      ) : null}
    </form>
  );
}
