"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/SignInForm";
import { useAuthUser } from "@/hooks/useAuthUser";
import { auth } from "@/lib/firebase/client";

export function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuthUser();

  if (user === undefined) {
    return (
      <main className="container max-w-lg mx-auto py-16 px-4">
        <p className="text-muted-foreground">Checking sign-in…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container max-w-lg mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to summarize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Summaries require a signed-in account. Use a password or an email link.
            </p>
            <SignInForm />
            <p className="text-sm">
              <Link className="underline" href="/signin">
                Open the sign-in page
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4 pt-6 flex justify-end items-center gap-3 text-sm">
        <span className="text-muted-foreground">{user.email}</span>
        <Button type="button" variant="outline" onClick={() => void signOut(auth)}>
          Sign out
        </Button>
      </div>
      {children}
    </div>
  );
}
