"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="container max-w-2xl mx-auto py-20 px-4">
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-destructive">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
