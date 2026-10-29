import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  GoogleAuthProvider: class GoogleAuthProvider {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
}));

import { signInWithGoogle } from "./google-sign-in";

const auth = {} as never;

describe("signInWithGoogle", () => {
  beforeEach(() => {
    signInWithPopup.mockReset();
    signInWithRedirect.mockReset();
  });

  it("signs in with a Google popup and does not redirect", async () => {
    signInWithPopup.mockResolvedValue({ user: { uid: "user-1" } });

    await signInWithGoogle(auth);

    expect(signInWithPopup).toHaveBeenCalledOnce();
    expect(signInWithPopup.mock.calls[0]?.[0]).toBe(auth);
    expect(signInWithPopup.mock.calls[0]?.[1]).toBeInstanceOf(GoogleAuthProvider);
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it("falls back to redirect only when the popup is blocked", async () => {
    const blocked = { code: "auth/popup-blocked" };
    signInWithPopup.mockRejectedValue(blocked);
    signInWithRedirect.mockResolvedValue(undefined);

    await signInWithGoogle(auth);

    const provider = signInWithPopup.mock.calls[0]?.[1];
    expect(signInWithRedirect).toHaveBeenCalledOnce();
    expect(signInWithRedirect).toHaveBeenCalledWith(auth, provider);
  });

  it("rethrows other popup errors without redirecting", async () => {
    const closed = { code: "auth/popup-closed-by-user" };
    signInWithPopup.mockRejectedValue(closed);

    await expect(signInWithGoogle(auth)).rejects.toBe(closed);
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });
});
