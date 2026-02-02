import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container max-w-2xl mx-auto py-20 px-4">
      <Card>
        <CardContent className="pt-6 space-y-4 text-center">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            The page you are looking for does not exist.
          </p>
          <div className="pt-4">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
