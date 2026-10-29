"use client";

import { useEffect, useState } from "react";
import { subscribeToAuth } from "@/lib/firebase/client";

export type SignedInUser = {
  uid: string;
  email: string | null;
};

export function useAuthUser(): SignedInUser | null | undefined {
  const [user, setUser] = useState<SignedInUser | null | undefined>(undefined);

  useEffect(() => {
    return subscribeToAuth((next) => {
      setUser(next ? { uid: next.uid, email: next.email } : null);
    });
  }, []);

  return user;
}
