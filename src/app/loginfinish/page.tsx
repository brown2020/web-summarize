"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMAIL_LINK_STORAGE_KEY } from "@/components/SignInForm";
import { auth } from "@/lib/firebase/client";

function failureCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "unknown";
}

export default function LoginFinishPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  async function complete(address: string) {
    setPending(true);
    setError(null);
    try {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        throw new Error("invalid-link");
      }
      await signInWithEmailLink(auth, address.trim(), window.location.href);
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      router.replace("/");
    } catch (caught) {
      console.error(`Email link sign-in failed: ${failureCode(caught)}`);
      setError("This sign-in link is invalid or expired. Request a new one.");
      setPending(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const stored = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
      if (!stored) {
        setNeedsEmail(true);
        setPending(false);
        return;
      }
      setEmail(stored);
      await complete(stored);
    })();
    return () => {
      cancelled = true;
    };
    // Read the one-time link once, after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void complete(email);
  }

  return (
    <main className="container max-w-lg mx-auto py-16 px-4 space-y-4">
      <h1 className="text-2xl font-semibold">Finishing sign-in</h1>
      {pending ? <p className="text-muted-foreground">Completing sign-in…</p> : null}
      {needsEmail ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <p className="text-sm text-muted-foreground">
            Confirm the email address that received this link.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">Email</Label>
            <Input
              id="confirm-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Continue
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
