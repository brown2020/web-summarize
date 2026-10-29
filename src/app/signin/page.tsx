"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/SignInForm";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function SignInPage() {
  const user = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/");
  }, [router, user]);

  return (
    <main className="container max-w-lg mx-auto py-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign in with email and password or Google. An email link is also available.
          </p>
          <SignInForm />
          <p className="text-sm">
            <Link className="underline" href="/">
              Back to Web Summarizer
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
